# Fix Supabase Email Deliverability (Stop Emails Going to Spam)

## Problem
Verification emails from Supabase are ending up in spam folders instead of inboxes.

## Root Causes
1. **Default Supabase Email Service**: Uses a shared domain (`@supabase.co`) which has lower reputation
2. **Missing SPF/DKIM/DMARC Records**: No email authentication configured
3. **Generic Email Templates**: Default templates may trigger spam filters
4. **No Custom Domain**: Using Supabase's default sending domain

## Solutions (Choose One)

### Option 1: Use Custom SMTP (Recommended - Best Deliverability)

#### Step 1: Choose an Email Service Provider

**Recommended Options:**
- **Resend** (Best for developers, free tier: 3,000 emails/month)
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **Amazon SES** (Very cheap, $0.10 per 1,000 emails)

#### Step 2: Set Up Resend (Recommended)

1. **Sign up at [resend.com](https://resend.com)**
2. **Add your domain** (`bhimsonsagropark.com`):
   - Go to Domains → Add Domain
   - Add `bhimsonsagropark.com`
   - Resend will provide DNS records to add

3. **Add DNS Records** (in your domain registrar):
   ```
   Type: TXT
   Name: @
   Value: [Resend provides this]
   
   Type: CNAME
   Name: resend._domainkey
   Value: [Resend provides this]
   ```

4. **Get API Key**:
   - Go to API Keys → Create API Key
   - Copy the API key

#### Step 3: Configure in Supabase

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter settings:
   ```
   Host: smtp.resend.com
   Port: 465 (or 587)
   Username: resend
   Password: [Your Resend API Key]
   Sender email: noreply@bhimsonsagropark.com
   Sender name: Bhimsons Agro Park
   ```

### Option 2: Use SendGrid

1. **Sign up at [sendgrid.com](https://sendgrid.com)**
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Verify Domain**: Settings → Sender Authentication → Domain Authentication
4. **Add DNS Records** (provided by SendGrid)
5. **Configure in Supabase**:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Your SendGrid API Key]
   Sender email: noreply@bhimsonsagropark.com
   ```

### Option 3: Use Mailgun

1. **Sign up at [mailgun.com](https://mailgun.com)**
2. **Add Domain**: Sending → Domains → Add New Domain
3. **Add DNS Records** (provided by Mailgun)
4. **Get SMTP Credentials**: Sending → Domain Settings → SMTP credentials
5. **Configure in Supabase**:
   ```
   Host: smtp.mailgun.org
   Port: 587
   Username: [Your Mailgun SMTP username]
   Password: [Your Mailgun SMTP password]
   Sender email: noreply@bhimsonsagropark.com
   ```

## Step 4: Customize Email Templates

### In Supabase Dashboard:
1. Go to **Authentication** → **Email Templates**
2. Customize templates:
   - **Confirm signup**
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

### Best Practices for Email Templates:

```html
<!-- Good Email Template Example -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #F5A623;">Welcome to Bhimsons Agro Park!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <a href="{{ .ConfirmationURL }}" 
           style="display: inline-block; background-color: #F5A623; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email Address
        </a>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p style="word-break: break-all; color: #666;">{{ .ConfirmationURL }}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">
            If you didn't create an account, please ignore this email.<br>
            Bhimsons Agro Park | Maharashtra, India
        </p>
    </div>
</body>
</html>
```

## Step 5: Add SPF, DKIM, and DMARC Records

### SPF Record (if using custom SMTP)
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```
(Replace `_spf.resend.com` with your provider's SPF record)

### DKIM Record
(Provided by your email service provider)

### DMARC Record
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@bhimsonsagropark.com
```

## Step 6: Test Email Deliverability

1. **Send test email** from Supabase
2. **Check spam score** using:
   - [Mail-Tester.com](https://www.mail-tester.com)
   - [MXToolbox](https://mxtoolbox.com)
3. **Monitor**:
   - Check spam folder initially
   - Mark as "Not Spam" if it arrives there
   - Monitor bounce rates in your email provider dashboard

## Quick Fix (Temporary Solution)

If you can't set up custom SMTP immediately:

1. **Ask users to check spam folder** and mark as "Not Spam"
2. **Add to contacts**: Ask users to add `noreply@supabase.co` to their contacts
3. **Use Magic Link** instead of email verification (less likely to be flagged)

## Recommended: Use Resend

**Why Resend?**
- ✅ Easy setup
- ✅ Great deliverability
- ✅ Free tier: 3,000 emails/month
- ✅ Developer-friendly API
- ✅ Good documentation

**Quick Setup:**
1. Sign up: https://resend.com
2. Add domain: `bhimsonsagropark.com`
3. Add DNS records (5 minutes)
4. Configure in Supabase SMTP settings
5. Done!

## Monitoring

After setup:
1. Monitor email delivery rates in your provider dashboard
2. Check bounce rates
3. Monitor spam complaints
4. Adjust templates if needed

## Support

If emails still go to spam:
1. Check DNS records are correct (use [MXToolbox](https://mxtoolbox.com))
2. Verify domain authentication is complete
3. Check email content (avoid spam trigger words)
4. Warm up your domain (send gradually increasing volumes)
