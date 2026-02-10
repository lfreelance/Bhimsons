#!/bin/bash
# Build script for Vercel - generates config.js from environment variables

CONFIG_FILE="Frontend/js/config.js"
cp Frontend/js/config.example.js "$CONFIG_FILE"

# Replace placeholders with actual env vars
sed -i.bak "s|https://your-project-ref.supabase.co|${SUPABASE_URL}|g" "$CONFIG_FILE"
sed -i.bak "s|your-supabase-anon-key-here|${SUPABASE_ANON_KEY}|g" "$CONFIG_FILE"
sed -i.bak "s|YOUR_RAZORPAY_KEY_ID|${RAZORPAY_KEY_ID}|g" "$CONFIG_FILE"

rm -f "${CONFIG_FILE}.bak"
echo "config.js generated successfully"
