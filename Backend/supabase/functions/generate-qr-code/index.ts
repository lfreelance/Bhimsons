// @ts-nocheck
// =====================================================
// GENERATE QR CODE - Edge Function
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

interface QRRequest {
  booking_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Parse request body
    const { booking_id }: QRRequest = await req.json();

    if (!booking_id) {
      throw new Error("Missing booking_id");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("booking_number, visit_date, num_adults, num_children")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Create QR code data
    const qrData = JSON.stringify({
      booking_id: booking_id,
      booking_number: booking.booking_number,
      visit_date: booking.visit_date,
      guests: booking.num_adults + booking.num_children,
      verified: true,
      timestamp: new Date().toISOString(),
    });

    // Encode QR data for URL
    const encodedData = encodeURIComponent(qrData);

    // Generate QR code using QR Server API (free service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&bgcolor=ffffff&color=000000&margin=10`;

    // Update booking with QR code
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        qr_code: qrData,
        qr_code_url: qrCodeUrl,
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("Failed to update booking with QR code:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr_code_url: qrCodeUrl,
        booking_number: booking.booking_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating QR code:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate QR code",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
