# 🔑 AWS Credentials Fix Guide

## 🚨 **Current Error**
```json
{
    "success": false,
    "error": "The security token included in the request is invalid."
}
```

This error means the AWS credentials are invalid, expired, or not properly configured.

## 🔧 **Solution Steps**

### **Step 1: Verify AWS Credentials**

1. **Go to AWS IAM Console**: https://console.aws.amazon.com/iam/
2. **Check your user**: Look for the user you created for email service
3. **Verify the access keys are active** and not expired

### **Step 2: Create New Access Keys (if needed)**

If your current keys are invalid:

1. **Go to IAM Console** → Users → Your email service user
2. **Security credentials tab**
3. **Create access key** → Application running outside AWS
4. **Download the credentials** (you can only see them once!)

### **Step 3: Set Environment Variables in Production**

Add these to your production environment (Vercel, Netlify, etc.):

```bash
AWS_ACCESS_KEY_ID=AKIA... (your access key)
AWS_SECRET_ACCESS_KEY=... (your secret key)
AWS_REGION=us-east-1
```

### **Step 4: Verify SES Permissions**

Make sure your IAM user has the correct permissions:

1. **Attach policy**: `AmazonSESFullAccess`
2. **Or create custom policy** with these permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

### **Step 5: Test the Fix**

After setting the credentials:

1. **Deploy the updated code**
2. **Test using**: `https://marketing.thedigitalmorph.com/test-email`
3. **Check for success message**

## 🧪 **Local Testing**

To test locally, create a `.env.local` file:

```bash
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

Then run:
```bash
node test_ses_credentials.js
```

## 🔍 **Common Issues & Solutions**

| Error | Solution |
|-------|----------|
| "Invalid security token" | Check credentials are correct and active |
| "Access denied" | Verify IAM permissions for SES |
| "Invalid parameter" | Check email addresses are verified |
| "Rate limit exceeded" | Request sending limit increase in SES |

## ✅ **Expected Results**

After fixing the credentials:
- ✅ No more "invalid security token" errors
- ✅ Emails sent successfully via Amazon SES
- ✅ Success response with message ID
- ✅ Emails delivered to `chairman@falconeyegroup.net`

## 📞 **Next Steps**

1. **Get valid AWS credentials** from IAM console
2. **Set them in production** environment variables
3. **Deploy and test** the email system
4. **Verify emails** are being delivered

The email system is ready - you just need valid AWS credentials! 🚀
