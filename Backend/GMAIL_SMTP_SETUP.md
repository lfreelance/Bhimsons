# Setting Up Gmail SMTP for Supabase

## ⚠️ Important Limitations

**Gmail SMTP has restrictions:**
- **Rate Limit**: 500 emails per day (free Gmail account)
- **Security**: Requires App Password (not regular password)
- **2FA Required**: Must enable 2-Factor Authentication
- **Not Ideal**: Better for personal use, not production apps
- **Deliverability**: May still go to spam

## ✅ Better Alternative (Recommended)

Instead of Gmail SMTP, use **Resend** with your domain:
- No rate limits (3,000 emails/month free)
- Better deliverability
- Professional appearance (`noreply@bhimsonsagropark.com`)
- You already have Resend set up!

**But if you want to use Gmail, here's how:**

---

## Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Follow the setup process

## Step 2: Create App Password

1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and **Other (Custom name)**
3. Enter name: "Supabase Auth"
4. Click **Generate**
5. **Copy the 16-character password** (you'll need this!)

## Step 3: Configure in Supabase

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter these settings:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587 (or 465 for SSL)
SMTP Username: bhimsonsagropark@gmail.com
SMTP Password: [The 16-character App Password from Step 2]
Sender Email: bhimsonsagropark@gmail.com
Sender Name: Bhimsons Agro Park
```

5. Click **Save**

## Step 4: Test

1. Try registering a new user
2. Check if verification email arrives
3. Check spam folder if needed

---

## ⚠️ Rate Limit Warning

**Gmail Free Account Limits:**
- 500 emails per day
- If you exceed this, emails will fail
- Rate limit resets daily

**If you hit the limit:**
- Wait 24 hours
- Or upgrade to Google Workspace ($6/month) for higher limits
- Or switch to Resend (recommended)

---

## 🎯 Recommended: Use Resend Instead

**Why Resend is better:**
- ✅ 3,000 emails/month free (vs Gmail's 500/day)
- ✅ Better deliverability
- ✅ Professional domain email
- ✅ No 2FA/App Password setup needed
- ✅ You already have Resend configured!

**To use Resend:**
1. Use your existing Resend API key
2. Set sender email to: `noreply@bhimsonsagropark.com` (or any email on your domain)
3. Configure in Supabase SMTP settings:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [Your Resend API Key]
   Sender Email: noreply@bhimsonsagropark.com
   ```

---

## Troubleshooting

**"Invalid credentials" error:**
- Make sure you're using App Password, not regular password
- Verify 2FA is enabled
- Check username is correct (full email)

**"Rate limit exceeded":**
- You've hit Gmail's 500/day limit
- Wait 24 hours or switch to Resend

**Emails going to spam:**
- Gmail SMTP has lower reputation
- Use Resend for better deliverability
