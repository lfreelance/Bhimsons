# Bhimson's Agro Park - Backend

This folder contains all backend-related code including Supabase database schema, Edge Functions, and configuration.

## 📁 Folder Structure

```
Backend/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Database schema
│   └── functions/
│       ├── create-razorpay-order/    # Create payment order
│       ├── verify-payment/           # Verify payment signature
│       ├── send-confirmation-email/  # Send booking confirmation
│       └── generate-qr-code/         # Generate booking QR code
├── config/
│   └── env.example.txt               # Environment variables template
└── README.md
```

## 🚀 Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys from Settings > API

### 2. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL script
5. This will create:
   - All required tables (profiles, passes, bookings, payments, etc.)
   - Row Level Security (RLS) policies
   - Triggers and functions
   - Default pass data

### 3. Deploy Edge Functions

#### Option A: Using the Deploy Script (Recommended)

```bash
# Navigate to Backend folder
cd Backend

# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

#### Option B: Manual Deployment with Supabase CLI

**Step 1: Install Supabase CLI**

```bash
# macOS (using Homebrew)
brew install supabase/tap/supabase

# Or using npm (any OS)
npm install -g supabase

# Verify installation
supabase --version
```

**Step 2: Authenticate and Link Project**

```bash
# Navigate to Backend folder
cd Backend

# Login to Supabase (opens browser)
supabase login

# Link to your project
# Find your PROJECT_REF in Supabase Dashboard URL:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF
supabase link --project-ref YOUR_PROJECT_REF
```

**Step 3: Set Secrets (Environment Variables)**

```bash
# Razorpay credentials (required for payments)
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_secret

# Resend API key (required for emails)
supabase secrets set RESEND_API_KEY=re_xxxxx

# Your frontend URL (for CORS and email links)
supabase secrets set FRONTEND_URL=https://your-domain.com

# View all secrets (values hidden)
supabase secrets list
```

**Step 4: Deploy Functions**

```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy create-razorpay-order --no-verify-jwt
supabase functions deploy verify-payment --no-verify-jwt
supabase functions deploy send-confirmation-email --no-verify-jwt
supabase functions deploy generate-qr-code --no-verify-jwt
```

> **Note:** `--no-verify-jwt` allows the functions to be called from your frontend. For production, you may want to implement proper JWT verification.

**Step 5: Verify Deployment**

```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs create-razorpay-order --tail

# Test a function locally
supabase functions serve
```

#### Your Edge Function URLs

After deployment, your functions will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-razorpay-order
https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-confirmation-email
https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-qr-code
```

### 4. Set Environment Variables (Dashboard Method)

Alternatively, set secrets via Supabase Dashboard:

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add each secret:

```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=bookings@bhimsonsagropark.com
APP_URL=https://your-domain.com
```

### 5. Configure Frontend

Update `Frontend/js/config.js` with your Supabase credentials:

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    RAZORPAY_KEY_ID: 'rzp_test_xxxxx',
    // ... other settings
};
```

### 6. Create Admin User

1. Register a new user through the website
2. In Supabase Dashboard > Table Editor > profiles
3. Find your user and set `is_admin` to `true`

## 📊 Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `passes` | Adventure passes (Day, Weekend, Monthly) |
| `bookings` | User bookings |
| `payments` | Payment records |
| `booking_logs` | Audit trail for bookings |
| `settings` | Admin configuration |

### Default Passes

The migration includes three default passes:
- **Day Pass**: ₹800 (was ₹1,299)
- **Weekend Getaway**: ₹4,000 (was ₹4,999) - Most Popular
- **Monthly Pass**: ₹30,000 (was ₹60,000)

## 🔐 Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Admin functions require `is_admin = true` in profile
- Payment verification uses HMAC-SHA256 signature

## 🧪 Testing

### Test Razorpay Payments

Use Razorpay test credentials:
- Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

### Test User Flow

1. Register a new account
2. Login and select a pass
3. Fill booking details
4. Complete test payment
5. Check booking confirmation

## 📧 Email Setup

The system uses [Resend](https://resend.com) for sending emails:

1. Create a Resend account
2. Verify your domain
3. Get API key
4. Add to Edge Function secrets

## 🔧 Troubleshooting

### Edge Functions Not Working
- Check if secrets are properly set
- View function logs in Supabase Dashboard

### RLS Errors
- Ensure user is authenticated
- Check if policies allow the operation

### Payment Failures
- Verify Razorpay credentials
- Check browser console for errors

## 📝 License

© 2026 Bhimson's Agro Park. All rights reserved.
