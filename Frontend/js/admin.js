/* ===================================
   Admin Module - Bhimson's Agro Park
   =================================== */

/**
 * Fetch dashboard statistics
 */
async function fetchDashboardStats() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        // Fetch booking stats
        const { data: stats, error: statsError } = await client
            .from('booking_stats')
            .select('*')
            .single();

        if (statsError) throw statsError;

        // Fetch user count
        const { count: userCount, error: userError } = await client
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        return {
            success: true,
            stats: {
                ...stats,
                total_users: userCount
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch statistics'
        };
    }
}

/**
 * Fetch all bookings with filters
 */
async function fetchAllBookings(filters = {}) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        let query = client
            .from('bookings_detailed')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.payment_status) {
            query = query.eq('payment_status', filters.payment_status);
        }

        if (filters.pass_name) {
            query = query.eq('pass_name', filters.pass_name);
        }

        if (filters.date_from) {
            query = query.gte('visit_date', filters.date_from);
        }

        if (filters.date_to) {
            query = query.lte('visit_date', filters.date_to);
        }

        if (filters.search) {
            query = query.or(`user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,booking_number.ilike.%${filters.search}%`);
        }

        // Pagination
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        if (filters.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            success: true,
            bookings: data,
            total: count
        };
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch bookings'
        };
    }
}

/**
 * Fetch all users
 */
async function fetchAllUsers(filters = {}) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        let query = client
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch booking counts for each user
        const usersWithBookings = await Promise.all(
            data.map(async (user) => {
                const { count } = await client
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                return {
                    ...user,
                    total_bookings: count || 0
                };
            })
        );

        return {
            success: true,
            users: usersWithBookings
        };
    } catch (error) {
        console.error('Error fetching users:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch users'
        };
    }
}

/**
 * Fetch all payments
 */
async function fetchAllPayments(filters = {}) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        let query = client
            .from('payments')
            .select(`
                *,
                bookings(
                    booking_number,
                    profiles(full_name, email)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.date_from) {
            query = query.gte('created_at', filters.date_from);
        }

        if (filters.date_to) {
            query = query.lte('created_at', filters.date_to);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
            success: true,
            payments: data
        };
    } catch (error) {
        console.error('Error fetching payments:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch payments'
        };
    }
}

/**
 * Update booking status
 */
async function updateBookingStatus(bookingId, newStatus, notes = '') {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const admin = await getCurrentUser();
    if (!admin) {
        throw new Error('Admin not logged in');
    }

    try {
        // Get current status
        const { data: currentBooking, error: fetchError } = await client
            .from('bookings')
            .select('status')
            .eq('id', bookingId)
            .single();

        if (fetchError) throw fetchError;

        // Update status
        const updateData = {
            status: newStatus
        };

        if (newStatus === 'cancelled') {
            updateData.cancelled_at = new Date().toISOString();
            updateData.cancellation_reason = notes;
        }

        if (newStatus === 'completed') {
            updateData.checked_in_at = new Date().toISOString();
        }

        const { data, error } = await client
            .from('bookings')
            .update(updateData)
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;

        // Log the action
        await client.from('booking_logs').insert({
            booking_id: bookingId,
            action: `status_changed_to_${newStatus}`,
            old_status: currentBooking.status,
            new_status: newStatus,
            performed_by: admin.id,
            notes: notes
        });

        return {
            success: true,
            booking: data,
            message: `Booking status updated to ${newStatus}`
        };
    } catch (error) {
        console.error('Error updating booking status:', error);
        return {
            success: false,
            error: error.message || 'Failed to update booking status'
        };
    }
}

/**
 * Fetch all passes (including inactive)
 */
async function fetchAllPasses() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('passes')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        return {
            success: true,
            passes: data
        };
    } catch (error) {
        console.error('Error fetching passes:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch passes'
        };
    }
}

/**
 * Update pass details
 */
async function updatePass(passId, updateData) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('passes')
            .update(updateData)
            .eq('id', passId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            pass: data,
            message: 'Pass updated successfully'
        };
    } catch (error) {
        console.error('Error updating pass:', error);
        return {
            success: false,
            error: error.message || 'Failed to update pass'
        };
    }
}

/**
 * Toggle pass active status
 */
async function togglePassStatus(passId, isActive) {
    return updatePass(passId, { is_active: isActive });
}

/**
 * Fetch settings
 */
async function fetchSettings() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('settings')
            .select('*');

        if (error) throw error;

        // Convert to key-value object
        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });

        return {
            success: true,
            settings: settings
        };
    } catch (error) {
        console.error('Error fetching settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch settings'
        };
    }
}

/**
 * Update settings
 */
async function updateSettings(key, value) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const admin = await getCurrentUser();
    if (!admin) {
        throw new Error('Admin not logged in');
    }

    try {
        const { data, error } = await client
            .from('settings')
            .update({
                value: value,
                updated_by: admin.id,
                updated_at: new Date().toISOString()
            })
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            setting: data,
            message: 'Settings updated successfully'
        };
    } catch (error) {
        console.error('Error updating settings:', error);
        return {
            success: false,
            error: error.message || 'Failed to update settings'
        };
    }
}

/**
 * Export bookings to CSV
 */
async function exportBookingsToCSV(filters = {}) {
    const result = await fetchAllBookings({ ...filters, limit: 10000 });

    if (!result.success) {
        showToast('Failed to export bookings', 'error');
        return;
    }

    const exportData = result.bookings.map(booking => ({
        'Booking Number': booking.booking_number,
        'Customer Name': booking.user_name,
        'Email': booking.user_email,
        'Phone': booking.user_phone,
        'Pass Type': booking.pass_name,
        'Visit Date': formatDate(booking.visit_date, { weekday: undefined }),
        'Adults': booking.num_adults,
        'Children': booking.num_children,
        'Total Amount': booking.total_amount,
        'Booking Status': booking.status,
        'Payment Status': booking.payment_status || 'N/A',
        'Created At': formatDateTime(booking.created_at)
    }));

    const filename = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, filename);
}

/**
 * Export users to CSV
 */
async function exportUsersToCSV() {
    const result = await fetchAllUsers({ limit: 10000 });

    if (!result.success) {
        showToast('Failed to export users', 'error');
        return;
    }

    const exportData = result.users.map(user => ({
        'Name': user.full_name,
        'Email': user.email,
        'Phone': user.phone || 'N/A',
        'Total Bookings': user.total_bookings,
        'Admin': user.is_admin ? 'Yes' : 'No',
        'Registered On': formatDateTime(user.created_at)
    }));

    const filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, filename);
}

/**
 * Export payments to CSV
 */
async function exportPaymentsToCSV(filters = {}) {
    const result = await fetchAllPayments({ ...filters, limit: 10000 });

    if (!result.success) {
        showToast('Failed to export payments', 'error');
        return;
    }

    const exportData = result.payments.map(payment => ({
        'Payment ID': payment.razorpay_payment_id || payment.id,
        'Booking Number': payment.bookings?.booking_number || 'N/A',
        'Customer Name': payment.bookings?.profiles?.full_name || 'N/A',
        'Amount': payment.amount,
        'Currency': payment.currency,
        'Status': payment.status,
        'Payment Method': payment.payment_method || 'N/A',
        'Date': formatDateTime(payment.created_at)
    }));

    const filename = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, filename);
}

/**
 * Fetch login statistics for admin dashboard
 */
async function fetchLoginStats() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data: stats, error } = await client
            .from('login_stats')
            .select('*')
            .single();

        if (error) throw error;

        return {
            success: true,
            stats: stats
        };
    } catch (error) {
        console.error('Error fetching login stats:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch login statistics'
        };
    }
}

/**
 * Fetch recent login activity
 */
async function fetchRecentLogins(limit = 20) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('recent_logins')
            .select('*')
            .limit(limit);

        if (error) throw error;

        return {
            success: true,
            logins: data
        };
    } catch (error) {
        console.error('Error fetching recent logins:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch recent logins'
        };
    }
}

/**
 * Fetch detailed booking info by ID (for modal view)
 */
async function fetchBookingDetail(bookingId) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        // Fetch booking with all related data
        const { data: booking, error: bookingError } = await client
            .from('bookings')
            .select(`
                *,
                profiles(full_name, email, phone),
                passes(name, slug, price, duration)
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError) throw bookingError;

        // Fetch payment for this booking
        const { data: payment, error: paymentError } = await client
            .from('payments')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Payment might not exist (pending), so don't throw
        
        // Fetch booking logs
        const { data: logs, error: logsError } = await client
            .from('booking_logs')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false });

        return {
            success: true,
            booking: booking,
            payment: payment || null,
            logs: logs || []
        };
    } catch (error) {
        console.error('Error fetching booking detail:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch booking details'
        };
    }
}

/**
 * Get booking count by date range
 */
async function getBookingsByDateRange(startDate, endDate) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('bookings')
            .select('visit_date, total_amount, status')
            .gte('visit_date', startDate)
            .lte('visit_date', endDate)
            .in('status', ['confirmed', 'completed']);

        if (error) throw error;

        // Group by date
        const byDate = {};
        data.forEach(booking => {
            if (!byDate[booking.visit_date]) {
                byDate[booking.visit_date] = {
                    count: 0,
                    revenue: 0
                };
            }
            byDate[booking.visit_date].count++;
            byDate[booking.visit_date].revenue += booking.total_amount;
        });

        return {
            success: true,
            data: byDate
        };
    } catch (error) {
        console.error('Error fetching bookings by date:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
