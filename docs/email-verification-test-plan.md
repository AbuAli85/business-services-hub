# Email Verification Test Plan

## Test Scenarios

### **Test 1: Complete Signup Flow**
1. **Go to signup page** (`/auth/sign-up`)
2. **Fill out the form** with valid data
3. **Complete captcha** verification
4. **Submit the form**
5. **Expected Result**: 
   - User created successfully
   - Email verification modal appears
   - Success message: "Account created! Please check your email to verify your account."

### **Test 2: Email Verification Link**
1. **Check email inbox** for verification email
2. **Look for email from** Supabase/Business Services Hub
3. **Click the verification link**
4. **Expected Result**:
   - Redirected to verification page
   - Email verified successfully
   - Redirected to onboarding page

### **Test 3: Resend Verification Email**
1. **Click "Resend Email"** in the modal
2. **Expected Result**:
   - New verification email sent
   - Success message: "Verification email sent successfully!"
   - Email counter shows attempts

### **Test 4: Invalid Verification Link**
1. **Use expired/invalid link**
2. **Expected Result**:
   - Redirected to sign-in page
   - Error message: "Verification link has expired"
   - Option to request new verification

### **Test 5: Already Verified Email**
1. **Try to verify already verified email**
2. **Expected Result**:
   - Redirected to sign-in page
   - Message: "Email already verified. Please sign in."

## Debugging Steps

### **Step 1: Check Supabase Configuration**
```bash
# Check if email is enabled in Supabase dashboard
# Go to Authentication > Settings > Email Templates
```

### **Step 2: Verify Email Templates**
- **Signup template** should be configured
- **Email confirmation** should be enabled
- **Redirect URL** should point to `/auth/verify-email`

### **Step 3: Test Email Sending**
```javascript
// Test in Supabase dashboard
// Go to Authentication > Users > Send Email
```

### **Step 4: Check Database**
```sql
-- Check if user was created
SELECT * FROM auth.users WHERE email = 'test@example.com';

-- Check if profile was created
SELECT * FROM profiles WHERE email = 'test@example.com';
```

### **Step 5: Check Logs**
```bash
# Check Supabase logs
# Go to Logs > Auth
```

## Common Issues and Solutions

### **Issue 1: Email Not Received**
**Causes:**
- Email templates not configured
- SMTP settings incorrect
- Email provider blocking emails
- Spam folder

**Solutions:**
1. Check Supabase email settings
2. Verify email templates
3. Check spam folder
4. Test with different email provider

### **Issue 2: Verification Link Not Working**
**Causes:**
- Incorrect redirect URL
- Token expired
- Invalid token format

**Solutions:**
1. Check redirect URL in Supabase settings
2. Verify token format
3. Test with fresh token

### **Issue 3: User Not Redirected After Verification**
**Causes:**
- Profile creation failed
- Redirect URL incorrect
- Session not established

**Solutions:**
1. Check profile creation trigger
2. Verify redirect URL
3. Check session establishment

## Test Commands

### **Test Email Verification API**
```bash
curl -X GET "http://localhost:3000/auth/verify-email?token=test_token&type=signup"
```

### **Test Resend Email**
```bash
curl -X POST "https://your-project.supabase.co/auth/v1/resend" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "signup", "email": "test@example.com"}'
```

## Expected Flow

### **Normal Flow:**
1. User submits signup form
2. Supabase creates user in `auth.users`
3. Trigger creates profile in `profiles`
4. Supabase sends verification email
5. User receives email and clicks link
6. Verification page processes token
7. User is redirected to onboarding

### **Error Flow:**
1. User submits signup form
2. If error occurs, show error message
3. If email not received, show resend option
4. If verification fails, show error message
5. User can try again or contact support

## Monitoring

### **Success Metrics:**
- Signup completion rate
- Email delivery rate
- Verification completion rate
- User onboarding completion rate

### **Error Metrics:**
- Signup failure rate
- Email delivery failure rate
- Verification failure rate
- User drop-off rate

## Production Checklist

### **Before Going Live:**
- [ ] Email templates configured
- [ ] SMTP settings verified
- [ ] Redirect URLs correct
- [ ] Error handling implemented
- [ ] Logging enabled
- [ ] Monitoring set up

### **After Going Live:**
- [ ] Monitor email delivery rates
- [ ] Check verification success rates
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Iterate based on data

## Conclusion

The email verification system should work as follows:
1. **User signs up** → Account created
2. **Email sent** → User receives verification email
3. **User clicks link** → Email verified
4. **User redirected** → Onboarding or dashboard

If any step fails, appropriate error messages should be shown to guide the user.
