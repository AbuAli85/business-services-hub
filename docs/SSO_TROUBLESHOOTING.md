# 🔧 SSO Troubleshooting Guide

## Issue: `localStorage.getItem('sb-auth-token')` returns `null`

### Possible Causes:

1. **Not logged in yet** - You need to log in on business-services-hub first
2. **Session expired** - The session may have expired
3. **Storage key mismatch** - Configuration might not be applied
4. **@supabase/ssr behavior** - May use cookies instead of localStorage

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Check if you're logged in

**In browser console, run:**
```javascript
// Check all localStorage keys
Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))

// Check cookies
document.cookie.split(';').filter(c => c.includes('supabase') || c.includes('sb-'))
```

**Expected:**
- If logged in, you should see session data in either localStorage or cookies

### Step 2: Try logging in

1. **Go to:** `/auth/sign-in`
2. **Log in** with your credentials
3. **After login, check again:**
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```

### Step 3: Verify configuration is applied

**Check if the client is using the correct storage key:**

1. **Open browser console**
2. **Run:**
   ```javascript
   // Import and check the client
   import('@/utils/supabase/client').then(module => {
     const supabase = module.createClient()
     supabase.auth.getSession().then(({data}) => {
       console.log('Session:', data.session)
       console.log('Storage key check:', localStorage.getItem('sb-auth-token'))
     })
   })
   ```

### Step 4: Check cross-platform

**If logged in on BusinessHub:**

1. **On BusinessHub, run:**
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
   Should return session data ✅

2. **On business-services-hub (same browser), run:**
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
   Should return the SAME session data ✅

**If it returns `null` on business-services-hub:**
- The storage key might not be configured correctly
- Or you need to log in on business-services-hub first

---

## 🛠️ Quick Fixes

### Fix 1: Clear and re-login

```javascript
// Clear all storage
localStorage.clear()
sessionStorage.clear()

// Then log in again
```

### Fix 2: Verify configuration

**Check `utils/supabase/client.ts`:**
```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-auth-token',  // ← Must be present
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )
}
```

### Fix 3: Check @supabase/ssr version

**In `package.json`, verify:**
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.2"  // Should support storageKey option
  }
}
```

---

## 🧪 Testing SSO

### Test 1: Same Browser, Different Tabs

1. **Login on BusinessHub** (Tab 1)
2. **Open business-services-hub** (Tab 2)
3. **Check localStorage:**
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
4. **Expected:** Should return session data ✅

### Test 2: After Login on business-services-hub

1. **Login on business-services-hub**
2. **Check localStorage:**
   ```javascript
   localStorage.getItem('sb-auth-token')
   ```
3. **Expected:** Should return session data ✅

### Test 3: Cross-Platform Check

1. **Login on BusinessHub**
2. **Open business-services-hub**
3. **Check if automatically logged in**
4. **If not, check:**
   - Same browser?
   - Same domain? (localhost vs production)
   - Storage key configured?

---

## 📋 Common Issues

### Issue: Session not persisting

**Solution:**
- Verify `persistSession: true` is set
- Check browser console for errors
- Verify browser allows localStorage

### Issue: Different storage keys

**Solution:**
- All platforms must use `storageKey: 'sb-auth-token'`
- Check all Supabase client configurations
- Restart development server after changes

### Issue: @supabase/ssr using cookies

**Note:** `@supabase/ssr` may use cookies for SSR compatibility. This is normal and should still work for SSO if the storage key is configured correctly.

---

## ✅ Verification Checklist

- [ ] Logged in on business-services-hub
- [ ] `localStorage.getItem('sb-auth-token')` returns data
- [ ] Configuration has `storageKey: 'sb-auth-token'`
- [ ] Same Supabase project URL on all platforms
- [ ] Same anon key on all platforms
- [ ] Tested cross-platform login

---

## 🆘 Still Not Working?

1. **Check browser console** for errors
2. **Verify environment variables** are set correctly
3. **Clear browser cache** and try again
4. **Check if other platforms** (BusinessHub) have the same issue
5. **Verify Supabase project** is the same across all platforms

---

**Last Updated:** After SSO configuration
**Status:** Configuration complete, testing required

