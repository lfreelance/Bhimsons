-- =====================================================
-- LOGIN TRACKING & ADMIN SETUP
-- Bhimson's Agro Park
-- =====================================================

-- =====================================================
-- 1. USER LOGINS TABLE (tracks every login event)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(50)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_logins_user ON public.user_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_date ON public.user_logins(login_at DESC);

-- =====================================================
-- 2. ROW LEVEL SECURITY FOR USER LOGINS
-- =====================================================
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

-- Users can insert their own login records
DROP POLICY IF EXISTS "Users can log their own logins" ON public.user_logins;
CREATE POLICY "Users can log their own logins"
    ON public.user_logins FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can view their own login history
DROP POLICY IF EXISTS "Users can view their own logins" ON public.user_logins;
CREATE POLICY "Users can view their own logins"
    ON public.user_logins FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all logins
DROP POLICY IF EXISTS "Admins can view all logins" ON public.user_logins;
CREATE POLICY "Admins can view all logins"
    ON public.user_logins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Grant access to authenticated users
GRANT ALL ON public.user_logins TO authenticated;

-- =====================================================
-- 3. LOGIN STATS VIEW FOR ADMIN DASHBOARD
-- =====================================================
CREATE OR REPLACE VIEW public.login_stats
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) FILTER (WHERE DATE(login_at) = CURRENT_DATE) as today_logins,
    COUNT(DISTINCT user_id) FILTER (WHERE DATE(login_at) = CURRENT_DATE) as today_unique_users,
    COUNT(*) FILTER (WHERE login_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_logins,
    COUNT(DISTINCT user_id) FILTER (WHERE login_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_unique_users,
    COUNT(*) FILTER (WHERE login_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_logins,
    COUNT(DISTINCT user_id) FILTER (WHERE login_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_unique_users
FROM public.user_logins;

GRANT SELECT ON public.login_stats TO authenticated;

-- =====================================================
-- 4. RECENT LOGINS VIEW (with user details)
-- =====================================================
CREATE OR REPLACE VIEW public.recent_logins
WITH (security_invoker = true)
AS
SELECT
    ul.id,
    ul.login_at,
    ul.user_agent,
    p.full_name,
    p.email,
    p.phone
FROM public.user_logins ul
JOIN public.profiles p ON ul.user_id = p.id
ORDER BY ul.login_at DESC;

GRANT SELECT ON public.recent_logins TO authenticated;

-- =====================================================
-- NOTE: ADMIN USER SETUP
-- =====================================================
-- After the admin registers on the website with:
--   Email: admin@bhimsonsagropark.com
--   Password: baapadventure
--
-- Run this command in Supabase SQL Editor to promote them:
--
--   UPDATE public.profiles
--   SET is_admin = true
--   WHERE email = 'admin@bhimsonsagropark.com';
--
-- =====================================================
