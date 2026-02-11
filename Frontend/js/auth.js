/* ===================================
   Authentication Module - Bhimson's Agro Park
   =================================== */

/**
 * Register a new user
 */
async function registerUser(email, password, fullName, phone) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        // Sign up with Supabase Auth
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone
                }
            }
        });

        if (error) throw error;

        // Update profile with additional info
        if (data.user) {
            const { error: profileError } = await client
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone
                })
                .eq('id', data.user.id);

            if (profileError) {
                console.error('Profile update error:', profileError);
            }
        }

        return {
            success: true,
            user: data.user,
            message: 'Registration successful! Please check your email to verify your account.'
        };
    } catch (error) {
        console.error('Registration error:', error);
        return {
            success: false,
            error: error.message || 'Registration failed'
        };
    }
}

/**
 * Login user
 */
async function loginUser(email, password) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Track login event
        if (data.user) {
            try {
                await client.from('user_logins').insert({
                    user_id: data.user.id,
                    user_agent: navigator.userAgent || null
                });
            } catch (loginLogError) {
                // Don't block login if tracking fails
                console.warn('Login tracking failed:', loginLogError);
            }
        }

        return {
            success: true,
            user: data.user,
            session: data.session
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message || 'Login failed'
        };
    }
}

/**
 * Logout user
 */
async function logoutUser() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { error } = await client.auth.signOut();
        if (error) throw error;

        // Clear local storage
        removeLocal('selected_pass');
        removeLocal('booking_draft');

        return {
            success: true,
            message: 'Logged out successfully'
        };
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: error.message || 'Logout failed'
        };
    }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Password reset email sent! Please check your inbox.'
        };
    } catch (error) {
        console.error('Password reset error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send password reset email'
        };
    }
}

/**
 * Update password (after reset)
 */
async function updatePassword(newPassword) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { error } = await client.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Password updated successfully!'
        };
    } catch (error) {
        console.error('Password update error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update password'
        };
    }
}

/**
 * Update user profile
 */
async function updateProfile(profileData) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    try {
        const { data, error } = await client
            .from('profiles')
            .update(profileData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            profile: data,
            message: 'Profile updated successfully!'
        };
    } catch (error) {
        console.error('Profile update error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update profile'
        };
    }
}

/**
 * Check if user is authenticated and redirect accordingly
 */
async function requireAuth(redirectUrl = 'login.html') {
    const loggedIn = await isLoggedIn();
    
    if (!loggedIn) {
        // Store intended destination
        storeLocal('auth_redirect', window.location.href);
        redirectTo(redirectUrl, 'Please login to continue', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Redirect if already logged in
 */
async function redirectIfLoggedIn(redirectUrl = 'select-pass.html') {
    const loggedIn = await isLoggedIn();
    
    if (loggedIn) {
        window.location.href = redirectUrl;
        return true;
    }
    
    return false;
}

/**
 * Check if user is admin and redirect if not
 */
async function requireAdmin(redirectUrl = 'index.html') {
    const admin = await isAdmin();
    
    if (!admin) {
        redirectTo(redirectUrl, 'Access denied. Admin privileges required.', 'error');
        return false;
    }
    
    return true;
}

/**
 * Get auth redirect URL and clear it
 */
function getAuthRedirect() {
    const redirect = getLocal('auth_redirect');
    if (redirect) {
        removeLocal('auth_redirect');
        return redirect;
    }
    return null;
}

/**
 * Update the header UI based on auth state
 */
async function updateHeaderAuthUI() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    const loggedIn = await isLoggedIn();
    const profile = loggedIn ? await getUserProfile() : null;

    if (loggedIn && profile) {
        // Create user menu
        navActions.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-toggle" id="userMenuToggle">
                    <span class="user-avatar">${profile.full_name?.charAt(0) || 'U'}</span>
                    <span class="user-name">${profile.full_name || 'User'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="user-dropdown" id="userDropdown">
                    ${profile.is_admin ? `
                    <a href="admin-dashboard.html" class="dropdown-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Admin Panel
                    </a>
                    ` : `
                    <a href="dashboard.html" class="dropdown-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Dashboard
                    </a>
                    <a href="select-pass.html" class="dropdown-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Book Pass
                    </a>
                    `}
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item logout-btn" id="logoutBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const toggle = document.getElementById('userMenuToggle');
        const dropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        toggle?.addEventListener('click', () => {
            dropdown?.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                dropdown?.classList.remove('show');
            }
        });

        logoutBtn?.addEventListener('click', async () => {
            const result = await logoutUser();
            if (result.success) {
                redirectTo('index.html', 'Logged out successfully', 'success');
            }
        });
    } else {
        // Show login/register buttons
        navActions.innerHTML = `
            <a href="login.html" class="btn-outline btn-sm">LOGIN</a>
            <a href="register.html" class="btn-primary btn-sm">REGISTER</a>
        `;
    }
}

// Update header on page load
document.addEventListener('DOMContentLoaded', updateHeaderAuthUI);
