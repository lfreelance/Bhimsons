/* ===================================
   Utility Functions - Bhimson's Agro Park
   =================================== */

/**
 * Format currency in Indian Rupees
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format date to readable string
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(date).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Format date and time
 */
function formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(date, { weekday: undefined });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
function isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    const errors = [];
    
    if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 4000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show loading spinner
 */
function showLoading(element, text = 'Loading...') {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    
    if (!element) return;
    
    element.dataset.originalContent = element.innerHTML;
    element.disabled = true;
    element.innerHTML = `
        <span class="spinner"></span>
        <span>${text}</span>
    `;
}

/**
 * Hide loading spinner
 */
function hideLoading(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    
    if (!element) return;
    
    element.disabled = false;
    if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    }
}

/**
 * Show confirmation modal
 */
function showConfirmModal(options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-primary',
            isDangerous = false
        } = options;
        
        // Remove existing modals
        const existingModals = document.querySelectorAll('.confirm-modal-overlay');
        existingModals.forEach(modal => modal.remove());
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal-overlay';
        modal.innerHTML = `
            <div class="confirm-modal">
                <h3 class="confirm-modal-title">${title}</h3>
                <p class="confirm-modal-message">${message}</p>
                <div class="confirm-modal-actions">
                    <button class="btn-outline confirm-modal-cancel">${cancelText}</button>
                    <button class="${isDangerous ? 'btn-danger' : confirmClass} confirm-modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const cancelBtn = modal.querySelector('.confirm-modal-cancel');
        const confirmBtn = modal.querySelector('.confirm-modal-confirm');
        
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                resolve(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Debounce function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

/**
 * Set URL parameter without reload
 */
function setUrlParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}

/**
 * Generate random string
 */
function generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy', 'error');
        return false;
    }
}

/**
 * Download data as CSV
 */
function downloadCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Build CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let cell = row[header] ?? '';
                // Escape quotes and wrap in quotes if contains comma
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        )
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Calculate booking total
 */
function calculateBookingTotal(passPrice, numAdults, numChildren = 0) {
    const adultTotal = passPrice * numAdults;
    const childTotal = (passPrice * CONFIG.CHILD_PRICE_PERCENTAGE / 100) * numChildren;
    const subtotal = adultTotal + childTotal;
    const tax = subtotal * (CONFIG.TAX_PERCENTAGE / 100);
    const total = subtotal + tax + CONFIG.CONVENIENCE_FEE;
    
    return {
        adultTotal,
        childTotal,
        subtotal,
        tax,
        convenienceFee: CONFIG.CONVENIENCE_FEE,
        total: Math.round(total)
    };
}

/**
 * Check if date is valid for booking
 *
 * NOTE:
 * - We allow up to 365 days of advance booking so that
 *   full upcoming months remain selectable in the calendar.
 */
function isValidBookingDate(date) {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setHours(minDate.getHours() + CONFIG.MIN_ADVANCE_HOURS);

    const maxDate = new Date(today);
    const advanceDays = 365;
    maxDate.setDate(maxDate.getDate() + advanceDays);

    return selectedDate >= minDate && selectedDate <= maxDate;
}

/**
 * Get minimum booking date
 */
function getMinBookingDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Minimum 1 day advance
    return formatDateForInput(date);
}

/**
 * Get maximum booking date
 *
 * NOTE:
 * - Returns a date 365 days from today so that the
 *   calendar shows an entire year of selectable dates.
 */
function getMaxBookingDate() {
    const date = new Date();
    date.setDate(date.getDate() + 365);
    return formatDateForInput(date);
}

/**
 * Store data in localStorage
 */
function storeLocal(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to store data:', error);
        return false;
    }
}

/**
 * Get data from localStorage
 */
function getLocal(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get data:', error);
        return null;
    }
}

/**
 * Remove data from localStorage
 */
function removeLocal(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Failed to remove data:', error);
        return false;
    }
}

/**
 * Redirect to page with optional message
 */
function redirectTo(url, message = null, messageType = 'info') {
    if (message) {
        storeLocal('redirect_message', { message, type: messageType });
    }
    window.location.href = url;
}

/**
 * Show redirect message if exists
 */
function showRedirectMessage() {
    const data = getLocal('redirect_message');
    if (data) {
        showToast(data.message, data.type);
        removeLocal('redirect_message');
    }
}

// Show redirect message on page load
document.addEventListener('DOMContentLoaded', showRedirectMessage);
