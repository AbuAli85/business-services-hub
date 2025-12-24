# Why `localStorage.getItem('sb-auth-token')` Returns `null`

## ✅ Current Status

**Configuration:** ✅ Correct - `storageKey: 'sb-auth-token'` is set  
**Session:** ❌ Not logged in yet  
**Result:** `null` (expected - no session to store)

---

## 🔍 Why You're Seeing `null`

### The Console Shows:
```
✅ Supabase client connected successfully (no active session)
localStorage.getItem('sb-auth-token') → null
```

**This means:**
1. ✅ Supabase client is configured correctly
2. ✅ Configuration is being applied
3. ❌ You're not logged in yet
4. ❌ No session exists to store

**This is normal and expected!** The session is only created **after** you log in.

---

## 📋 What Happens When You Log In

### Before Login:
```javascript
localStorage.getItem('sb-auth-token')  // → null (no session yet)
```

### After Login:
1. You enter credentials at `/auth/sign-in`
2. Supabase authenticates you
3. Session is created
4. Session is stored in `sb-auth-token` (because of our configuration)
5. Now: `localStorage.getItem('sb-auth-token')` → Returns session data ✅

---

## 🧪 Test the Configuration

### Option 1: Quick Test (Before Login)

Run this in browser console to verify configuration:
```javascript
// Copy from: scripts/test-sso-config.js
testSSOConfig()
```

This will:
- ✅ Verify Supabase client can be created
- ✅ Check if configuration is correct
- ✅ Confirm you're not logged in (expected)
- ✅ Provide next steps

### Option 2: After Login Test

1. **Log in** at `/auth/sign-in`
2. **After login**, run:
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
3. **Expected:** Returns JSON string with session data

---

## ⚠️ Important: @supabase/ssr Behavior

`@supabase/ssr` is designed for Server-Side Rendering and may:
- Use **cookies** by default (for SSR compatibility)
- Use **localStorage** when explicitly configured (which we did)

Our configuration explicitly sets:
```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
storageKey: 'sb-auth-token',
```

This should work, but if you see cookies instead of localStorage after login, that's also normal for SSR setups.

---

## 🔧 Verification Steps

### Step 1: Check Configuration
```javascript
// The client should be using our configuration
// This is already set in utils/supabase/client.ts
```

### Step 2: Log In
1. Go to `/auth/sign-in`
2. Enter your credentials
3. Click "Sign In"

### Step 3: Verify Session Storage
After login, check:
```javascript
// Should return session data
localStorage.getItem('sb-auth-token')

// Or check cookies (if @supabase/ssr uses cookies)
document.cookie.split(';').filter(c => c.includes('sb-'))
```

---

## 🎯 Expected Flow

### Current State (Not Logged In):
```
User → Not logged in
Session → null
localStorage.getItem('sb-auth-token') → null ✅ (expected)
```

### After Login:
```
User → Logs in at /auth/sign-in
Session → Created by Supabase
Session → Stored in sb-auth-token (our config)
localStorage.getItem('sb-auth-token') → Session data ✅
```

---

## ✅ Summary

**You're seeing `null` because:**
- ✅ Configuration is correct
- ✅ Client is working
- ❌ You haven't logged in yet
- ❌ No session exists to store

**Solution:**
1. Go to `/auth/sign-in`
2. Log in
3. Session will be stored in `sb-auth-token`
4. SSO will work

---

## 🆘 Still Seeing `null` After Login?

If you log in and still see `null`:

1. **Check cookies instead:**
   ```javascript
   document.cookie.split(';').filter(c => c.includes('sb-'))
   ```

2. **Check all localStorage keys:**
   ```javascript
   Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase'))
   ```

3. **Run diagnostic:**
   ```javascript
   // Copy from: scripts/diagnose-sso-issue.js
   diagnoseSSO()
   ```

4. **Verify login was successful:**
   - Check if you can access protected routes
   - Check browser console for errors
   - Verify you're actually logged in

---

**Last Updated:** After SSO configuration  
**Status:** Configuration correct - Just need to log in!

