#!/bin/bash

# Bhimson's Agro Park - Edge Functions Deployment Script
# ======================================================

echo "🚀 Bhimson's Agro Park - Edge Functions Deployment"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Install it using one of these methods:"
    echo "  macOS:  brew install supabase/tap/supabase"
    echo "  npm:    npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "📝 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in. Running 'supabase login'..."
    supabase login
fi

echo ""
echo "🔗 Make sure you've linked your project:"
echo "   Run: supabase link --project-ref YOUR_PROJECT_REF"
echo ""

# Deploy functions
echo "📦 Deploying Edge Functions..."
echo ""

functions=("create-razorpay-order" "verify-payment" "send-confirmation-email" "generate-qr-code")

for func in "${functions[@]}"; do
    echo "  Deploying: $func"
    supabase functions deploy "$func" --no-verify-jwt
    if [ $? -eq 0 ]; then
        echo "  ✅ $func deployed successfully"
    else
        echo "  ❌ Failed to deploy $func"
    fi
    echo ""
done

echo "=================================================="
echo "✨ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Set your secrets if not already done:"
echo "      supabase secrets set RAZORPAY_KEY_ID=your_key"
echo "      supabase secrets set RAZORPAY_KEY_SECRET=your_secret"
echo "      supabase secrets set RESEND_API_KEY=your_key"
echo "      supabase secrets set FRONTEND_URL=https://your-domain.com"
echo ""
echo "   2. Test your functions:"
echo "      supabase functions serve (for local testing)"
echo ""
echo "   3. View logs:"
echo "      supabase functions logs create-razorpay-order"
echo ""
