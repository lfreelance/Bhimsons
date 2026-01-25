-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- Run this in Supabase SQL Editor to fix the warnings
-- =====================================================

-- Drop existing views
DROP VIEW IF EXISTS public.bookings_detailed;
DROP VIEW IF EXISTS public.booking_stats;

-- Recreate booking_stats view with SECURITY INVOKER (default)
CREATE OR REPLACE VIEW public.booking_stats 
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_bookings,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_bookings,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND visit_date >= CURRENT_DATE) as upcoming_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'completed')), 0) as total_revenue,
    COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status IN ('confirmed', 'completed')), 0) as today_revenue
FROM public.bookings;

-- Recreate bookings_detailed view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.bookings_detailed 
WITH (security_invoker = true)
AS
SELECT
    b.id,
    b.booking_number,
    b.visit_date,
    b.num_adults,
    b.num_children,
    b.total_guests,
    b.total_amount,
    b.status,
    b.special_requests,
    b.qr_code_url,
    b.created_at,
    p.full_name as user_name,
    p.email as user_email,
    p.phone as user_phone,
    ps.name as pass_name,
    ps.price as pass_price,
    pay.status as payment_status,
    pay.razorpay_payment_id
FROM public.bookings b
JOIN public.profiles p ON b.user_id = p.id
JOIN public.passes ps ON b.pass_id = ps.id
LEFT JOIN public.payments pay ON b.id = pay.booking_id;

-- Grant access to authenticated users
GRANT SELECT ON public.booking_stats TO authenticated;
GRANT SELECT ON public.bookings_detailed TO authenticated;
