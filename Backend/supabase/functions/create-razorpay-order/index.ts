// @ts-nocheck
// =====================================================
// CREATE RAZORPAY ORDER - Edge Function
// Bhimson's Agro Park
// NOTE: This file runs on Deno (Supabase Edge Functions)
// IDE errors can be safely ignored
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  booking_id: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    // Parse request body
    const { booking_id, amount }: OrderRequest = await req.json();

    if (!booking_id || !amount) {
      throw new Error("Missing required fields: booking_id and amount");
    }

    // Validate amount (must be in paise for Razorpay)
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
      throw new Error("Amount must be at least ₹1");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, profiles(full_name, email, phone)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Create Razorpay order
    const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${razorpayAuth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: booking.booking_number,
        notes: {
          booking_id: booking_id,
          booking_number: booking.booking_number,
          customer_name: booking.profiles?.full_name,
          customer_email: booking.profiles?.email,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      throw new Error(`Razorpay error: ${errorData.error?.description || "Unknown error"}`);
    }

    const order = await razorpayResponse.json();

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: booking_id,
        razorpay_order_id: order.id,
        amount: amount,
        currency: "INR",
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
    }

    // Return order details for frontend
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
        payment_id: payment?.id,
        key_id: RAZORPAY_KEY_ID,
        prefill: {
          name: booking.profiles?.full_name,
          email: booking.profiles?.email,
          contact: booking.profiles?.phone,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Razorpay order:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create order",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
