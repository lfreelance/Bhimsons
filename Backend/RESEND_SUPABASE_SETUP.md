# How to Set Up Resend for Supabase Authentication Emails

## ✅ Why Resend is Better

- **3,000 emails/month FREE** (vs Gmail's 500/day)
- **Better deliverability** - less likely to go to spam
- **Professional** - use your domain email
- **Easy setup** - no 2FA or App Passwords needed
- **You already have Resend!** - same account for booking emails

---

## Step-by-Step Setup

### Step 1: Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/login)
2. Log in with your account
3. Go to **API Keys** (left sidebar)
4. Click **Create API Key**
5. Name it: "Supabase Auth"
6. **Copy the API key** (starts with `re_...`)
   - ⚠️ **Save it now** - you won't see it again!

### Step 2: Add Your Domain (If Not Already Added)

**If you already have `bhimsonsagropark.com` added, skip to Step 3.**

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter: `bhimsonsagropark.com`
4. Click **Add**
5. Resend will show you DNS records to add

**Add DNS Records to Your Domain:**

Go to your domain registrar (where you bought `bhimsonsagropark.com`) and add these DNS records:

**Record 1 - SPF:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**Record 2 - DKIM:**
```
Type: CNAME
Name: resend._domainkey
Value: [Resend provides this - copy exactly]
```

**Record 3 - DMARC (Optional but recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@bhimsonsagropark.com
```

6. **Wait 5-10 minutes** for DNS to propagate
7. Go back to Resend → Domains
8. Click **Verify** - should show ✅ Verified

### Step 3: Configure Supabase SMTP Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** (gear icon, bottom left)
4. Click **Auth** (in left sidebar)
5. Scroll down to **SMTP Settings**
6. Click **Enable Custom SMTP** toggle
7. Fill in these settings:

```
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP Username: resend
SMTP Password: [Paste your Resend API Key here - starts with re_...]
Sender Email: noreply@bhimsonsagropark.com
Sender Name: Bhimsons Agro Park
```

8. Click **Save**

### Step 4: Test It!

1. Go to your website: `bhimsonsagropark.com/register.html`
2. Try registering a new test account
3. Check your email inbox (and spam folder)
4. You should receive the verification email!

---

## Troubleshooting

### ❌ No Password field in Supabase UI
If the SMTP Settings page doesn't show a Password field:
1. **Scroll down** – it may be below the Username field.
2. **Set password via API** – Get an access token from [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens), then run (replace placeholders):
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/config/auth" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"smtp_pass": "YOUR_RESEND_API_KEY"}'
   ```
   Your project ref is in the dashboard URL: `supabase.com/dashboard/project/iiwzsinmqwbseidzmmwz/` → ref is `iiwzsinmqwbseidzmmwz`.

### ❌ "Invalid credentials" error
- Make sure you're using the **API Key** (starts with `re_`), not the API ID
- Check that SMTP Username is exactly: `resend`
- Verify SMTP Port is `465` (or try `587`)

### ❌ "Domain not verified"
- Go to Resend → Domains
- Make sure `bhimsonsagropark.com` shows ✅ Verified
- If not, check DNS records are added correctly
- Wait 10-15 minutes for DNS propagation

### ❌ Emails still going to spam
- Make sure DNS records (SPF, DKIM) are added
- Use a professional sender name
- Wait 24-48 hours for domain reputation to build

### ❌ "Rate limit exceeded"
- Check Resend dashboard → Usage
- Free tier: 3,000 emails/month
- Upgrade if needed (very affordable)

---

## Quick Reference

**Resend SMTP Settings:**
```
Host: smtp.resend.com
Port: 465 (or 587)
Username: resend
Password: [Your Resend API Key]
Sender: noreply@bhimsonsagropark.com
```

**Where to find API Key:**
- Resend Dashboard → API Keys → Create/Copy

**Where to configure:**
- Supabase Dashboard → Settings → Auth → SMTP Settings

---

## ✅ That's It!

Once configured, all Supabase authentication emails (verification, password reset, etc.) will be sent through Resend instead of Supabase's default service.

**Benefits:**
- ✅ No more rate limit errors
- ✅ Better email deliverability
- ✅ Professional appearance
- ✅ Same account as your booking emails

Need help? Check the troubleshooting section above!
