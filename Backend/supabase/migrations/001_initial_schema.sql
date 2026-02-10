-- =====================================================
-- BHIMSON'S AGRO PARK - DATABASE SCHEMA
-- Supabase Migration File
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    emergency_contact VARCHAR(20),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- =====================================================
-- 2. PASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    duration VARCHAR(50), -- 'day', 'weekend', 'month'
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    max_capacity INTEGER DEFAULT 100,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active passes
CREATE INDEX IF NOT EXISTS idx_passes_active ON public.passes(is_active);

-- =====================================================
-- 3. BOOKINGS TABLE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pass_id UUID NOT NULL REFERENCES public.passes(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    num_adults INTEGER NOT NULL DEFAULT 1 CHECK (num_adults >= 1),
    num_children INTEGER DEFAULT 0 CHECK (num_children >= 0),
    total_guests INTEGER GENERATED ALWAYS AS (num_adults + num_children) STORED,
    base_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    dietary_preferences TEXT,
    status booking_status DEFAULT 'pending',
    qr_code TEXT,
    qr_code_url TEXT,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pass ON public.bookings(pass_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(visit_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_number ON public.bookings(booking_number);

-- =====================================================
-- 4. PAYMENTS TABLE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'successful', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    error_code VARCHAR(50),
    error_description TEXT,
    refund_id VARCHAR(100),
    refund_amount DECIMAL(10, 2),
    refund_status VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- 5. BOOKING LOGS TABLE (for audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.booking_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_logs_booking ON public.booking_logs(booking_id);

-- =====================================================
-- 6. SETTINGS TABLE (for admin configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.bookings 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_number := 'BHM' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking number
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_number IS NULL THEN
        NEW.booking_number := generate_booking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_booking_number ON public.bookings;
CREATE TRIGGER trigger_set_booking_number
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_passes_updated_at ON public.passes;
CREATE TRIGGER update_passes_updated_at
    BEFORE UPDATE ON public.passes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- PASSES POLICIES
DROP POLICY IF EXISTS "Anyone can view active passes" ON public.passes;
CREATE POLICY "Anyone can view active passes"
    ON public.passes FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can view all passes" ON public.passes;
CREATE POLICY "Admins can view all passes"
    ON public.passes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can insert passes" ON public.passes;
CREATE POLICY "Admins can insert passes"
    ON public.passes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can update passes" ON public.passes;
CREATE POLICY "Admins can update passes"
    ON public.passes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- BOOKINGS POLICIES
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings"
    ON public.bookings FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
CREATE POLICY "Users can create their own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own pending bookings" ON public.bookings;
CREATE POLICY "Users can update their own pending bookings"
    ON public.bookings FOR UPDATE
    USING (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
    ON public.bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings"
    ON public.bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = payments.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create payments for their bookings" ON public.payments;
CREATE POLICY "Users can create payments for their bookings"
    ON public.payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_id
            AND bookings.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
CREATE POLICY "Admins can update all payments"
    ON public.payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- BOOKING LOGS POLICIES
DROP POLICY IF EXISTS "Users can view logs for their bookings" ON public.booking_logs;
CREATE POLICY "Users can view logs for their bookings"
    ON public.booking_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = booking_logs.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all logs" ON public.booking_logs;
CREATE POLICY "Admins can view all logs"
    ON public.booking_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- SETTINGS POLICIES
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
    ON public.settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default passes
INSERT INTO public.passes (name, slug, description, price, original_price, duration, features, is_active, sort_order) VALUES
(
    'Day Pass',
    'day-pass',
    'Enjoy 20+ unlimited adventure activities in one action-packed day',
    800.00,
    1299.00,
    'day',
    '["All land activities", "All water activities", "Lunch included", "Locker facility", "Parking included"]'::jsonb,
    TRUE,
    1
),
(
    'Weekend Getaway',
    'weekend-getaway',
    'A 2-day adventure escape with premium experiences',
    4000.00,
    4999.00,
    'weekend',
    '["All Day Pass benefits", "2 days unlimited access", "Deluxe room stay", "All meals included", "Spa access", "Complimentary breakfast", "Priority access to activities"]'::jsonb,
    TRUE,
    2
),
(
    'Monthly Pass',
    'monthly-pass',
    'Unlimited adventure access all month long, anytime',
    30000.00,
    60000.00,
    'month',
    '["Unlimited visits for 30 days", "All activities included", "10% discount on food", "Free parking", "Priority booking", "Exclusive member events", "Guest passes (2 per month)"]'::jsonb,
    TRUE,
    3
)
ON CONFLICT (slug) DO NOTHING;

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
('contact_info', '{"phone": "+91 98765 43210", "email": "info@bhimsonsagropark.com", "address": "Mountain Valley Road, Lonavala, Maharashtra 410401"}'::jsonb, 'Contact information'),
('booking_settings', '{"advance_booking_days": 30, "min_advance_hours": 24, "max_guests_per_booking": 20, "cancellation_hours": 48}'::jsonb, 'Booking configuration'),
('payment_settings', '{"tax_percentage": 18, "convenience_fee": 50}'::jsonb, 'Payment configuration')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- CREATE VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- View for booking statistics
CREATE OR REPLACE VIEW public.booking_stats AS
SELECT
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_bookings,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_bookings,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND visit_date >= CURRENT_DATE) as upcoming_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'completed')), 0) as total_revenue,
    COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status IN ('confirmed', 'completed')), 0) as today_revenue
FROM public.bookings;

-- View for detailed bookings with user and pass info
CREATE OR REPLACE VIEW public.bookings_detailed AS
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

-- Grant access to views
GRANT SELECT ON public.booking_stats TO authenticated;
GRANT SELECT ON public.bookings_detailed TO authenticated;
