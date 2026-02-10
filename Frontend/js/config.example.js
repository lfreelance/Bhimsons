/* ===================================
   Configuration - Bhimson's Agro Park
   =================================== */

// IMPORTANT: Copy this file as config.js and replace with your actual credentials
// cp config.example.js config.js

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://your-project-ref.supabase.co',
    SUPABASE_ANON_KEY: 'your-supabase-anon-key-here',
    
    // Edge Functions URLs (auto-generated from SUPABASE_URL)
    get EDGE_FUNCTIONS_URL() {
        return `${this.SUPABASE_URL}/functions/v1`;
    },
    
    // Razorpay Configuration
    RAZORPAY_KEY_ID: 'YOUR_RAZORPAY_KEY_ID',
    
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
