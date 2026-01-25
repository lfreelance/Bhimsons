/* ===================================
   Booking Module - Bhimson's Agro Park
   =================================== */

/**
 * Fetch all active passes
 */
async function fetchPasses() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('passes')
            .select('*')
            .eq('is_active', true)
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
 * Fetch a single pass by ID
 */
async function fetchPassById(passId) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('passes')
            .select('*')
            .eq('id', passId)
            .single();

        if (error) throw error;

        return {
            success: true,
            pass: data
        };
    } catch (error) {
        console.error('Error fetching pass:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch pass'
        };
    }
}

/**
 * Create a new booking
 */
async function createBooking(bookingData) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    try {
        // Calculate amounts
        const passResult = await fetchPassById(bookingData.pass_id);
        if (!passResult.success) {
            throw new Error('Failed to fetch pass details');
        }

        const pass = passResult.pass;
        const totals = calculateBookingTotal(
            pass.price,
            bookingData.num_adults,
            bookingData.num_children || 0
        );

        // Create booking
        const { data, error } = await client
            .from('bookings')
            .insert({
                user_id: user.id,
                pass_id: bookingData.pass_id,
                visit_date: bookingData.visit_date,
                num_adults: bookingData.num_adults,
                num_children: bookingData.num_children || 0,
                base_amount: totals.subtotal,
                tax_amount: totals.tax,
                total_amount: totals.total,
                special_requests: bookingData.special_requests || null,
                dietary_preferences: bookingData.dietary_preferences || null,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Log booking creation
        await client.from('booking_logs').insert({
            booking_id: data.id,
            action: 'booking_created',
            new_status: 'pending',
            notes: `Booking created for ${bookingData.num_adults} adults, ${bookingData.num_children || 0} children`
        });

        return {
            success: true,
            booking: data,
            totals: totals
        };
    } catch (error) {
        console.error('Error creating booking:', error);
        return {
            success: false,
            error: error.message || 'Failed to create booking'
        };
    }
}

/**
 * Fetch user's bookings
 */
async function fetchUserBookings(status = null) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    try {
        let query = client
            .from('bookings')
            .select(`
                *,
                passes(name, description, price, duration)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (status) {
            if (Array.isArray(status)) {
                query = query.in('status', status);
            } else {
                query = query.eq('status', status);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
            success: true,
            bookings: data
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
 * Fetch a single booking by ID
 */
async function fetchBookingById(bookingId) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('bookings')
            .select(`
                *,
                passes(name, description, price, duration, features),
                payments(*)
            `)
            .eq('id', bookingId)
            .single();

        if (error) throw error;

        return {
            success: true,
            booking: data
        };
    } catch (error) {
        console.error('Error fetching booking:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch booking'
        };
    }
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId, reason = '') {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        // Fetch booking to check if cancellable
        const { data: booking, error: fetchError } = await client
            .from('bookings')
            .select('status, visit_date')
            .eq('id', bookingId)
            .single();

        if (fetchError) throw fetchError;

        // Check if booking can be cancelled
        if (booking.status === 'cancelled') {
            throw new Error('Booking is already cancelled');
        }

        if (booking.status === 'completed') {
            throw new Error('Cannot cancel a completed booking');
        }

        // Check cancellation window
        const visitDate = new Date(booking.visit_date);
        const now = new Date();
        const hoursUntilVisit = (visitDate - now) / (1000 * 60 * 60);

        if (hoursUntilVisit < CONFIG.CANCELLATION_HOURS) {
            throw new Error(`Bookings can only be cancelled ${CONFIG.CANCELLATION_HOURS} hours before the visit date`);
        }

        // Update booking status
        const { data, error } = await client
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;

        // Log cancellation
        await client.from('booking_logs').insert({
            booking_id: bookingId,
            action: 'booking_cancelled',
            old_status: booking.status,
            new_status: 'cancelled',
            notes: reason || 'Cancelled by user'
        });

        return {
            success: true,
            booking: data,
            message: 'Booking cancelled successfully'
        };
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return {
            success: false,
            error: error.message || 'Failed to cancel booking'
        };
    }
}

/**
 * Get upcoming bookings
 */
async function getUpcomingBookings() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('bookings')
            .select(`
                *,
                passes(name, description, price, duration)
            `)
            .eq('user_id', user.id)
            .in('status', ['confirmed', 'pending'])
            .gte('visit_date', today)
            .order('visit_date', { ascending: true });

        if (error) throw error;

        return {
            success: true,
            bookings: data
        };
    } catch (error) {
        console.error('Error fetching upcoming bookings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch upcoming bookings'
        };
    }
}

/**
 * Get past bookings
 */
async function getPastBookings() {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('bookings')
            .select(`
                *,
                passes(name, description, price, duration)
            `)
            .eq('user_id', user.id)
            .or(`visit_date.lt.${today},status.eq.completed`)
            .order('visit_date', { ascending: false });

        if (error) throw error;

        return {
            success: true,
            bookings: data
        };
    } catch (error) {
        console.error('Error fetching past bookings:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch past bookings'
        };
    }
}

/**
 * Store selected pass for booking flow
 */
function selectPass(pass) {
    storeLocal('selected_pass', pass);
}

/**
 * Get selected pass
 */
function getSelectedPass() {
    return getLocal('selected_pass');
}

/**
 * Clear selected pass
 */
function clearSelectedPass() {
    removeLocal('selected_pass');
}

/**
 * Store booking draft
 */
function saveBookingDraft(draft) {
    storeLocal('booking_draft', draft);
}

/**
 * Get booking draft
 */
function getBookingDraft() {
    return getLocal('booking_draft');
}

/**
 * Clear booking draft
 */
function clearBookingDraft() {
    removeLocal('booking_draft');
}
