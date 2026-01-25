// @ts-nocheck
// =====================================================
// SEND CONFIRMATION EMAIL - Edge Function
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

interface EmailRequest {
  booking_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "bookings@bhimsonsagropark.com";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "https://bhimsonsagropark.com";

    if (!RESEND_API_KEY) {
      throw new Error("Resend API key not configured");
    }

    // Parse request body
    const { booking_id }: EmailRequest = await req.json();

    if (!booking_id) {
      throw new Error("Missing booking_id");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        profiles(full_name, email, phone),
        passes(name, description, price)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    const customerEmail = booking.profiles?.email;
    const customerName = booking.profiles?.full_name || "Guest";

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    // Format date
    const visitDate = new Date(booking.visit_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D0D0D; color: #FFFFFF;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
      <h1 style="color: #F5A623; margin: 0; font-size: 28px; letter-spacing: 2px;">BHIMSON'S AGRO PARK</h1>
      <p style="color: #888; margin: 10px 0 0 0;">Adventure Awaits!</p>
    </div>

    <!-- Confirmation Badge -->
    <div style="text-align: center; padding: 30px 0;">
      <div style="display: inline-block; background-color: #1a3d1a; border: 2px solid #4CAF50; border-radius: 50%; width: 80px; height: 80px; line-height: 80px;">
        <span style="color: #4CAF50; font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #FFFFFF; margin: 20px 0 10px 0;">Booking Confirmed!</h2>
      <p style="color: #888; margin: 0;">Thank you for your booking, ${customerName}!</p>
    </div>

    <!-- Booking Details -->
    <div style="background-color: #1A1A1A; border-radius: 12px; padding: 25px; margin: 20px 0;">
      <h3 style="color: #F5A623; margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 10px;">Booking Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #888;">Booking Number</td>
          <td style="padding: 10px 0; color: #FFFFFF; text-align: right; font-weight: bold;">${booking.booking_number}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888;">Pass Type</td>
          <td style="padding: 10px 0; color: #F5A623; text-align: right; font-weight: bold;">${booking.passes?.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888;">Visit Date</td>
          <td style="padding: 10px 0; color: #FFFFFF; text-align: right;">${visitDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #888;">Guests</td>
          <td style="padding: 10px 0; color: #FFFFFF; text-align: right;">${booking.num_adults} Adult(s)${booking.num_children > 0 ? `, ${booking.num_children} Child(ren)` : ""}</td>
        </tr>
        <tr style="border-top: 1px solid #333;">
          <td style="padding: 15px 0 10px 0; color: #888; font-size: 18px;">Total Amount</td>
          <td style="padding: 15px 0 10px 0; color: #F5A623; text-align: right; font-size: 24px; font-weight: bold;">₹${booking.total_amount.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <!-- QR Code Section -->
    ${booking.qr_code_url ? `
    <div style="text-align: center; padding: 20px; background-color: #FFFFFF; border-radius: 12px; margin: 20px 0;">
      <p style="color: #333; margin: 0 0 15px 0; font-weight: bold;">Your Entry QR Code</p>
      <img src="${booking.qr_code_url}" alt="QR Code" style="width: 200px; height: 200px;">
      <p style="color: #666; margin: 15px 0 0 0; font-size: 12px;">Show this QR code at the entrance</p>
    </div>
    ` : ""}

    <!-- Important Info -->
    <div style="background-color: #1A1A1A; border-left: 4px solid #F5A623; padding: 20px; margin: 20px 0;">
      <h4 style="color: #F5A623; margin: 0 0 10px 0;">Important Information</h4>
      <ul style="color: #CCC; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Please arrive 30 minutes before park opening</li>
        <li>Carry a valid photo ID for all guests</li>
        <li>Wear comfortable clothes and shoes</li>
        <li>Swimming costume required for water activities</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; padding: 20px 0;">
      <a href="${APP_URL}/dashboard.html" style="display: inline-block; background-color: #F5A623; color: #000000; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; letter-spacing: 1px;">VIEW MY BOOKING</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 30px 0; border-top: 1px solid #333; margin-top: 20px;">
      <p style="color: #888; margin: 0 0 10px 0;">Questions? Contact us:</p>
      <p style="color: #F5A623; margin: 0;">+91 98765 43210 | info@bhimsonsagropark.com</p>
      <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">© 2026 Bhimson's Agro Park. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Bhimson's Agro Park <${FROM_EMAIL}>`,
        to: [customerEmail],
        subject: `Booking Confirmed - ${booking.booking_number} | Bhimson's Agro Park`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Email send failed: ${JSON.stringify(errorData)}`);
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent",
        email_id: emailResult.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
