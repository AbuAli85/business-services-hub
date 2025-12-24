# 🚀 SSO Quick Start Guide

## Current Situation

You're seeing `localStorage.getItem('sb-auth-token')` return `null` because **you're not logged in on business-services-hub yet**.

## ✅ Solution: Log In First

SSO configuration is complete, but you need to **log in** to create the session.

---

## 📋 Step-by-Step Instructions

### Option 1: Log In on business-services-hub (Recommended)

1. **Go to:** `/auth/sign-in` on business-services-hub
2. **Log in** with your credentials
3. **After login**, check:
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
   Should now return session data ✅

### Option 2: Sync Session from BusinessHub (If Same Domain)

**⚠️ Important:** This only works if both platforms are on the **same domain/origin**.

1. **Make sure you're logged in on BusinessHub** (in another tab)
2. **On business-services-hub**, open browser console (F12)
3. **Run the sync script:**
   ```javascript
   // Copy and paste the entire script from: scripts/sync-sso-from-businesshub.js
   // Then run:
   syncSSOFromBusinessHub()
   ```

---

## 🔍 Understanding the Issue

### Why `null`?

- ✅ Configuration is correct (`storageKey: 'sb-auth-token'` is set)
- ❌ You're not logged in yet
- ❌ No session exists to store

### Console Output Explained

```
✅ Supabase client connected successfully (no active session)
```

This means:
- ✅ Supabase client is configured correctly
- ❌ No active session (you're not logged in)

---

## 🧪 Testing After Login

### Test 1: Verify Session Storage

After logging in, run:
```javascript
localStorage.getItem('sb-auth-token')
```

**Expected:** Returns JSON string with session data

### Test 2: Check Session Details

```javascript
const session = JSON.parse(localStorage.getItem('sb-auth-token'));
console.log('User:', session.user?.email);
console.log('Expires:', new Date(session.expires_at * 1000).toLocaleString());
```

### Test 3: Cross-Platform SSO

1. **Login on business-services-hub**
2. **Open BusinessHub** (same browser, same domain)
3. **Check if automatically logged in**

**Note:** SSO via localStorage only works if platforms are on the same origin (same protocol, domain, and port).

---

## ⚠️ Important Limitations

### localStorage and Same-Origin Policy

**SSO via localStorage only works if:**
- ✅ Platforms are on the **same domain** (e.g., both on `localhost` or both on `yourdomain.com`)
- ✅ Platforms are on the **same port** (e.g., both on port 3000)

**SSO won't work if:**
- ❌ Platforms are on different ports (e.g., `localhost:3000` vs `localhost:3001`)
- ❌ Platforms are on different domains (e.g., `app1.com` vs `app2.com`)

### Solutions for Different Origins

If platforms are on different origins, consider:

1. **Use the same domain/subdomain:**
   - `app1.yourdomain.com` and `app2.yourdomain.com`
   - Configure cookies with `.yourdomain.com` domain

2. **Use cookies instead of localStorage:**
   - Configure Supabase to use cookies
   - Set cookie domain to parent domain

3. **Use a shared authentication service:**
   - Centralized auth service
   - Token-based authentication

---

## 🛠️ Diagnostic Tools

### Quick Diagnostic

Run in browser console:
```javascript
// Copy from: scripts/diagnose-sso-issue.js
diagnoseSSO()
```

### Check Login Status

```javascript
// Copy from: scripts/sync-sso-from-businesshub.js
checkLoginStatus()
```

### Sync from BusinessHub

```javascript
// Copy from: scripts/sync-sso-from-businesshub.js
syncSSOFromBusinessHub()
```

---

## ✅ Verification Checklist

After logging in:

- [ ] `localStorage.getItem('sb-auth-token')` returns data
- [ ] Session contains `access_token`
- [ ] Session contains `user` object
- [ ] Session `expires_at` is in the future
- [ ] Can access protected routes
- [ ] No 401 errors in console

---

## 🆘 Still Having Issues?

1. **Clear browser cache** and try again
2. **Check browser console** for errors
3. **Verify environment variables** are set correctly
4. **Check if you're actually logged in** (try accessing a protected route)
5. **Run diagnostic script** to see detailed information

---

## 📝 Summary

**Current Status:**
- ✅ Configuration: Complete
- ❌ Session: Not logged in yet

**Next Step:**
1. Go to `/auth/sign-in`
2. Log in
3. Session will be stored in `sb-auth-token`
4. SSO will work across platforms (if same origin)

---

**Last Updated:** After SSO configuration
**Status:** Ready - Just need to log in!

