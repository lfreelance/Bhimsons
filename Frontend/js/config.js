/* ===================================
   Configuration - Bhimson's Agro Park
   =================================== */

// IMPORTANT: Replace these values with your actual Supabase credentials
// In production, these should be loaded from environment variables

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://iiwzsinmqwbseidzmmwz.supabase.co', // e.g., 'https://xxxxx.supabase.co'
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpd3pzaW5tcXdic2VpZHptbXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDQ2NjMsImV4cCI6MjA4NDQ4MDY2M30.cXjStmsILrJe5cZpw-l0Ol0VH_K8pMbRRgHfEmBmEV4',
    
    // Edge Functions URLs (auto-generated from SUPABASE_URL)
    // After deploying Edge Functions, these will be available at:
    // https://YOUR_PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME
    get EDGE_FUNCTIONS_URL() {
        return `${this.SUPABASE_URL}/functions/v1`;
    },
    
    // Razorpay Configuration
    RAZORPAY_KEY_ID: 'YOUR_RAZORPAY_KEY_ID', // e.g., 'rzp_test_xxxxx'
    
    // Application Settings
    APP_NAME: "Bhimson's Agro Park",
    APP_URL: window.location.origin,
    
    // Pricing Settings
    TAX_PERCENTAGE: 18, // GST
    CONVENIENCE_FEE: 50,
    
    // Booking Settings
    MAX_GUESTS_PER_BOOKING: 20,
    MIN_ADVANCE_HOURS: 24,
    ADVANCE_BOOKING_DAYS: 30,
    CANCELLATION_HOURS: 48,
    
    // Child pricing (percentage of adult price)
    CHILD_PRICE_PERCENTAGE: 50,
    CHILD_AGE_LIMIT: 12,
    
    // Contact Information
    CONTACT: {
        phone: '+91 98765 43210',
        email: 'info@bhimsonsagropark.com',
        address: 'Mountain Valley Road, Lonavala, Maharashtra 410401'
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.CONTACT);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
