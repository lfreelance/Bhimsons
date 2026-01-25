/* ===================================
   Payment Module - Bhimson's Agro Park
   =================================== */

/**
 * Initialize Razorpay and process payment
 */
async function initiatePayment(bookingId, amount) {
    try {
        // Create Razorpay order via Edge Function
        const orderResponse = await createRazorpayOrder(bookingId, amount);

        if (!orderResponse.success) {
            throw new Error(orderResponse.error || 'Failed to create payment order');
        }

        // Open Razorpay checkout
        return new Promise((resolve, reject) => {
            const options = {
                key: orderResponse.key_id,
                amount: orderResponse.order.amount,
                currency: orderResponse.order.currency,
                name: CONFIG.APP_NAME,
                description: `Booking: ${orderResponse.order.receipt}`,
                order_id: orderResponse.order.id,
                prefill: orderResponse.prefill,
                theme: {
                    color: '#F5A623'
                },
                handler: async function(response) {
                    // Verify payment
                    const verifyResult = await verifyPayment(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        bookingId
                    );

                    if (verifyResult.success) {
                        resolve({
                            success: true,
                            payment_id: response.razorpay_payment_id,
                            booking_id: bookingId
                        });
                    } else {
                        reject(new Error(verifyResult.error || 'Payment verification failed'));
                    }
                },
                modal: {
                    ondismiss: function() {
                        reject(new Error('Payment cancelled by user'));
                    }
                }
            };

            const razorpay = new Razorpay(options);

            razorpay.on('payment.failed', function(response) {
                reject(new Error(response.error.description || 'Payment failed'));
            });

            razorpay.open();
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        throw error;
    }
}

/**
 * Create Razorpay order via Edge Function
 */
async function createRazorpayOrder(bookingId, amount) {
    try {
        const response = await fetch(
            `${CONFIG.SUPABASE_URL}/functions/v1/create-razorpay-order`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await getSession())?.access_token}`
                },
                body: JSON.stringify({
                    booking_id: bookingId,
                    amount: amount
                })
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return {
            success: false,
            error: error.message || 'Failed to create order'
        };
    }
}

/**
 * Verify payment via Edge Function
 */
async function verifyPayment(orderId, paymentId, signature, bookingId) {
    try {
        const response = await fetch(
            `${CONFIG.SUPABASE_URL}/functions/v1/verify-payment`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await getSession())?.access_token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                    booking_id: bookingId
                })
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error verifying payment:', error);
        return {
            success: false,
            error: error.message || 'Payment verification failed'
        };
    }
}

/**
 * Generate QR code for booking
 */
async function generateBookingQR(bookingId) {
    try {
        const response = await fetch(
            `${CONFIG.SUPABASE_URL}/functions/v1/generate-qr-code`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await getSession())?.access_token}`
                },
                body: JSON.stringify({
                    booking_id: bookingId
                })
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error generating QR code:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate QR code'
        };
    }
}

/**
 * Fetch payment details for a booking
 */
async function fetchPaymentDetails(bookingId) {
    const client = getSupabase();
    if (!client) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return {
            success: true,
            payment: data
        };
    } catch (error) {
        console.error('Error fetching payment:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch payment'
        };
    }
}

/**
 * Load Razorpay script dynamically
 */
function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.head.appendChild(script);
    });
}

/**
 * Download booking ticket as PDF
 */
async function downloadTicket(bookingId) {
    try {
        // Fetch booking details
        const result = await fetchBookingById(bookingId);
        if (!result.success) {
            throw new Error('Failed to fetch booking details');
        }

        const booking = result.booking;

        // Create printable ticket
        const ticketWindow = window.open('', '_blank');
        ticketWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Ticket - ${booking.booking_number}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #fff;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #F5A623;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        color: #F5A623;
                        margin: 0;
                        font-size: 24px;
                    }
                    .ticket-box {
                        border: 2px dashed #F5A623;
                        padding: 20px;
                        margin: 20px 0;
                    }
                    .booking-number {
                        font-size: 28px;
                        font-weight: bold;
                        color: #333;
                        text-align: center;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .detail-label {
                        color: #666;
                    }
                    .detail-value {
                        font-weight: bold;
                        color: #333;
                    }
                    .qr-section {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .qr-section img {
                        border: 10px solid #F5A623;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        margin-top: 30px;
                    }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BHIMSON'S AGRO PARK</h1>
                    <p>Entry Ticket</p>
                </div>
                
                <div class="ticket-box">
                    <div class="booking-number">${booking.booking_number}</div>
                </div>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Pass Type</span>
                        <span class="detail-value">${booking.passes?.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Visit Date</span>
                        <span class="detail-value">${formatDate(booking.visit_date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Guests</span>
                        <span class="detail-value">${booking.num_adults} Adult(s)${booking.num_children > 0 ? `, ${booking.num_children} Child(ren)` : ''}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total Amount</span>
                        <span class="detail-value">₹${booking.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="detail-value" style="color: ${booking.status === 'confirmed' ? 'green' : '#F5A623'};">${booking.status.toUpperCase()}</span>
                    </div>
                </div>
                
                ${booking.qr_code_url ? `
                <div class="qr-section">
                    <p>Scan this QR code at the entrance</p>
                    <img src="${booking.qr_code_url}" alt="QR Code" width="200" height="200">
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>Please carry a valid photo ID for all guests</p>
                    <p>Contact: +91 98765 43210 | info@bhimsonsagropark.com</p>
                    <p>© 2026 Bhimson's Agro Park. All rights reserved.</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        ticketWindow.document.close();

        return { success: true };
    } catch (error) {
        console.error('Error downloading ticket:', error);
        return {
            success: false,
            error: error.message || 'Failed to download ticket'
        };
    }
}
