# Email Verification Troubleshooting Guide

## Common Issues and Solutions

### 1. **Verification Email Not Received**

#### **Possible Causes:**

**A. Email Provider Issues**
- **Gmail**: Check spam/promotions folder
- **Yahoo**: Check spam folder
- **Outlook/Hotmail**: Check junk folder
- **Corporate Email**: May be blocked by company firewall

**B. Supabase Configuration Issues**
- Email templates not configured
- SMTP settings incorrect
- Rate limiting enabled

**C. User Email Issues**
- Typos in email address
- Email address doesn't exist
- Email provider blocking automated emails

#### **Solutions:**

**1. Check Supabase Email Settings**
```bash
# Check if email is enabled in Supabase dashboard
# Go to Authentication > Settings > Email Templates
```

**2. Verify Email Configuration**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check if email templates are configured
- Verify SMTP settings in Supabase dashboard

**3. Test Email Delivery**
```javascript
// Test email sending in Supabase dashboard
// Go to Authentication > Users > Send Email
```

**4. Check Email Provider Settings**
- Whitelist Supabase email addresses
- Check spam folder
- Verify email address is correct

### 2. **Same Email Registration Prevention**

#### **Current Implementation:**
- ✅ Database constraint on `profiles.email`
- ✅ API endpoint to check email existence
- ✅ Client-side validation before signup
- ✅ Server-side validation during signup

#### **How It Works:**
1. **Client-side check**: Before form submission
2. **Server-side check**: During Supabase signup
3. **Database constraint**: Prevents duplicate emails
4. **User feedback**: Clear error messages

### 3. **Debugging Steps**

#### **Step 1: Check Supabase Logs**
```bash
# Check authentication logs in Supabase dashboard
# Go to Logs > Auth
```

#### **Step 2: Test Email API**
```bash
curl -X POST https://your-project.supabase.co/auth/v1/resend \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "signup", "email": "test@example.com"}'
```

#### **Step 3: Check Database**
```sql
-- Check if user exists in profiles
SELECT * FROM profiles WHERE email = 'user@example.com';

-- Check if user exists in auth.users
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

### 4. **Email Verification Flow**

#### **Normal Flow:**
1. User submits signup form
2. Supabase creates user in `auth.users`
3. Trigger creates profile in `profiles`
4. Supabase sends verification email
5. User clicks verification link
6. User is redirected to onboarding

#### **Troubleshooting Flow:**
1. Check if user was created in database
2. Check if verification email was sent
3. Check email provider settings
4. Test with different email address
5. Check Supabase email logs

### 5. **Common Error Messages**

#### **"User already registered"**
- **Cause**: Email already exists in database
- **Solution**: User should sign in instead

#### **"Invalid email"**
- **Cause**: Email format is incorrect
- **Solution**: Check email format

#### **"Rate limit exceeded"**
- **Cause**: Too many signup attempts
- **Solution**: Wait before trying again

#### **"Captcha verification failed"**
- **Cause**: Captcha token is invalid
- **Solution**: Complete captcha again

### 6. **Testing Email Verification**

#### **Test 1: Valid Email**
```javascript
// Test with a valid email address
const testEmail = 'test@example.com'
```

#### **Test 2: Duplicate Email**
```javascript
// Try to register with same email twice
// Should show "User already registered" error
```

#### **Test 3: Invalid Email**
```javascript
// Test with invalid email format
const invalidEmail = 'not-an-email'
```

### 7. **Production Checklist**

#### **Before Going Live:**
- [ ] Email templates configured in Supabase
- [ ] SMTP settings verified
- [ ] Email uniqueness constraints in place
- [ ] Error handling implemented
- [ ] User feedback messages clear
- [ ] Rate limiting configured
- [ ] Captcha protection enabled

#### **Monitoring:**
- [ ] Email delivery rates
- [ ] Signup success rates
- [ ] Error rates
- [ ] User feedback

### 8. **Quick Fixes**

#### **If emails not sending:**
1. Check Supabase email settings
2. Verify email templates
3. Test with different email provider
4. Check spam folders

#### **If duplicate emails allowed:**
1. Run database migration
2. Check API endpoint
3. Verify client-side validation
4. Test signup flow

#### **If verification not working:**
1. Check verification link format
2. Verify redirect URL
3. Check email template
4. Test with different browser

### 9. **Support Information**

#### **For Users:**
- Check spam folder
- Verify email address
- Try different email provider
- Contact support if issues persist

#### **For Developers:**
- Check Supabase logs
- Verify database constraints
- Test API endpoints
- Check email configuration

### 10. **Next Steps**

1. **Deploy the migration** to fix email uniqueness
2. **Test the signup flow** with various scenarios
3. **Monitor email delivery** rates
4. **Gather user feedback** on the process
5. **Iterate and improve** based on data

## Conclusion

The email verification system is now robust with:
- ✅ **Email uniqueness enforcement**
- ✅ **Comprehensive validation**
- ✅ **Clear error messages**
- ✅ **Proper error handling**
- ✅ **User-friendly feedback**

If issues persist, check the Supabase dashboard logs and email configuration.
