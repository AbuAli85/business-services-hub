# 🚀 Vercel Environment Variables Setup Guide

## ❌ Current Issue
Your application is getting "Supabase environment variables not configured" error when deployed to production because the environment variables are not set in Vercel.

## ✅ Solution: Configure Environment Variables in Vercel

### Step 1: Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Select your project (business-services-hub)
3. Go to **Settings** tab

### Step 2: Add Environment Variables
1. Click on **Environment Variables** in the left sidebar
2. Add the following variables:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://reootcngcptfogfozlmz.supabase.co
Environment: Production, Preview, Development

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0
Environment: Production, Preview, Development

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE
Environment: Production, Preview, Development
```

#### Optional Variables:
```
NODE_ENV
Value: production
Environment: Production, Preview, Development

NEXT_PUBLIC_APP_URL
Value: https://your-domain.vercel.app (replace with your actual domain)
Environment: Production, Preview, Development
```

### Step 3: Redeploy
1. After adding the environment variables, go to **Deployments** tab
2. Find your latest deployment and click **Redeploy**
3. Or push a new commit to trigger automatic deployment

### Step 4: Verify
1. Check the deployment logs to ensure no environment variable errors
2. Test your application functionality

## 🔧 Alternative: Use Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
vercel --prod
```

## 📝 Important Notes

- **NEXT_PUBLIC_** prefix**: Variables with this prefix are exposed to the browser
- **Environment selection**: Choose which environments (Production/Preview/Development) each variable applies to
- **Redeployment required**: Environment variable changes require a redeployment to take effect
- **Security**: Never commit sensitive keys to your repository

## 🚨 Troubleshooting

If you still get errors after setting environment variables:
1. Ensure all variables are set for the correct environment
2. Redeploy your application
3. Check Vercel deployment logs for any build errors
4. Verify the variable names match exactly (case-sensitive)

## 📞 Need Help?

- Check Vercel documentation: [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- Vercel support: [support.vercel.com](https://support.vercel.com)
