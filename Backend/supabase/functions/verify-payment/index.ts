// @ts-nocheck
// =====================================================
// VERIFY PAYMENT - Edge Function
// Bhimson's Agro Park
// NOTE: This file runs on Deno (Supabase Edge Functions)
// IDE errors can be safely ignored
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secret not configured");
    }

    // Parse request body
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    }: VerifyRequest = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      throw new Error("Missing required payment verification fields");
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (isValid) {
      // Update payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          status: "successful",
          payment_method: "razorpay",
        })
        .eq("razorpay_order_id", razorpay_order_id);

      if (paymentError) {
        console.error("Failed to update payment:", paymentError);
      }

      // Update booking status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
        })
        .eq("id", booking_id);

      if (bookingError) {
        console.error("Failed to update booking:", bookingError);
      }

      // Log the successful payment
      await supabase.from("booking_logs").insert({
        booking_id: booking_id,
        action: "payment_successful",
        old_status: "pending",
        new_status: "confirmed",
        notes: `Payment ID: ${razorpay_payment_id}`,
      });

      // Trigger confirmation email (call another function)
      try {
        const emailResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-confirmation-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ booking_id }),
          }
        );
        console.log("Email trigger response:", await emailResponse.text());
      } catch (emailError) {
        console.error("Failed to trigger confirmation email:", emailError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment verified successfully",
          booking_id: booking_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Payment verification failed
      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_description: "Signature verification failed",
        })
        .eq("razorpay_order_id", razorpay_order_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment verification failed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Error verifying payment:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Payment verification failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
