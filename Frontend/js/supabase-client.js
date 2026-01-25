/* ===================================
   Supabase Client - Bhimson's Agro Park
   =================================== */

// Import Supabase from CDN (loaded in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase = null;

/**
 * Initialize Supabase client
 */
function initSupabase() {
    if (supabase) return supabase;
    
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.error('Supabase URL not configured. Please update js/config.js');
        return null;
    }
    
    if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('Supabase Anon Key not configured. Please update js/config.js');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );
        
        console.log('Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return null;
    }
}

/**
 * Get Supabase client instance
 */
function getSupabase() {
    if (!supabase) {
        return initSupabase();
    }
    return supabase;
}

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
    const client = getSupabase();
    if (!client) return null;
    
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Get current session
 */
async function getSession() {
    const client = getSupabase();
    if (!client) return null;
    
    try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Check if user is logged in
 */
async function isLoggedIn() {
    const session = await getSession();
    return session !== null;
}

/**
 * Check if current user is admin
 */
async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const client = getSupabase();
    if (!client) return false;
    
    try {
        const { data, error } = await client
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        return data?.is_admin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Get user profile
 */
async function getUserProfile() {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const client = getSupabase();
    if (!client) return null;
    
    try {
        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Listen for auth state changes
 */
function onAuthStateChange(callback) {
    const client = getSupabase();
    if (!client) return null;
    
    return client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
});
