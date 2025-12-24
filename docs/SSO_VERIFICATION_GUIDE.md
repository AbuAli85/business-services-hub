# 🔍 SSO Configuration Verification Guide

This guide helps you verify that Single Sign-On (SSO) is correctly configured across all platforms.

## ✅ Current Status

### business-services-hub
- ✅ **Updated** - All Supabase clients now use `storageKey: 'sb-auth-token'`
- ✅ Main client: `utils/supabase/client.ts`
- ✅ Auth callback: `app/auth/callback/route.ts`
- ✅ Admin tools: `app/dashboard/admin/tools/page.tsx`

### BusinessHub
- ✅ **Already configured** (per your notes)

### Contract-Management-System
- ⚠️ **Needs verification** - Check if it uses `storageKey: 'sb-auth-token'`

---

## 🧪 Quick Verification Method

### Step 1: Check Browser Console

**On BusinessHub (after login):**
```javascript
localStorage.getItem('sb-auth-token')
```
**Expected:** Returns JSON string with session data ✅

**On business-services-hub:**
```javascript
localStorage.getItem('sb-auth-token')
```
**Expected:** Returns the SAME JSON string ✅

**On Contract-Management-System:**
```javascript
localStorage.getItem('sb-auth-token')
```
**Expected:** Returns the SAME JSON string ✅

**If any platform returns `null`:**
- ❌ That platform is NOT configured for SSO
- ❌ Needs to be updated with `storageKey: 'sb-auth-token'`

---

## 🔧 Using the Verification Script

A verification script is available at `scripts/verify-sso-config.js`.

### How to Use:

1. **Open browser console** (F12) on any platform
2. **Copy the entire script** from `scripts/verify-sso-config.js`
3. **Paste and run** in the console
4. **Or run:** `verifySSOConfig()` (if script was loaded)

### What It Checks:

- ✅ Storage key configuration (`sb-auth-token`)
- ✅ Session data availability
- ✅ Supabase project configuration
- ✅ All Supabase-related storage keys

---

## 📋 Manual Verification Checklist

### For Each Platform:

- [ ] **Find Supabase client file:**
  - Look for: `lib/supabase/client.ts`, `utils/supabase/client.ts`, etc.
  
- [ ] **Check configuration:**
  ```typescript
  export const supabase = createClient(url, key, {
    auth: {
      storageKey: 'sb-auth-token',  // ← MUST BE PRESENT
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  ```

- [ ] **Verify in browser:**
  ```javascript
  localStorage.getItem('sb-auth-token')
  ```
  Should return session data (not `null`)

---

## 🧪 Testing SSO

### Test 1: Cross-Platform Login
1. **Login** on BusinessHub
2. **Open** business-services-hub in new tab
3. **Expected:** Should be automatically logged in ✅

### Test 2: Reverse Test
1. **Login** on business-services-hub
2. **Open** BusinessHub in new tab
3. **Expected:** Should be automatically logged in ✅

### Test 3: Contract-Management-System
1. **Login** on BusinessHub
2. **Open** Contract-Management-System
3. **Expected:** Should be automatically logged in ✅

---

## 🐛 Troubleshooting

### Issue: Still requires separate logins

**Check 1: Storage Key**
```javascript
// Run on each platform
console.log('Storage key:', localStorage.getItem('sb-auth-token'))
```
All platforms should return the same value.

**Check 2: Supabase Project**
Verify all platforms use the same:
- Supabase URL: `https://reootcngcptfogfozlmz.supabase.co`
- Anon key: (should be the same across all platforms)

**Check 3: Clear and Retry**
```javascript
// Clear localStorage (will require re-login)
localStorage.clear()
// Then login on one platform and check others
```

### Issue: Session not persisting

**Solutions:**
- Verify `persistSession: true` is set
- Verify `storage` is set to `window.localStorage`
- Check browser console for errors
- Verify browser allows localStorage

### Issue: OAuth redirects not working

**Solutions:**
- Verify `detectSessionInUrl: true` is set
- Check OAuth redirect URLs in Supabase dashboard
- Verify all platforms are in allowed redirect URLs

---

## 📝 Files Updated in business-services-hub

1. **`utils/supabase/client.ts`**
   - Added `storageKey: 'sb-auth-token'`
   - Added full auth configuration

2. **`app/auth/callback/route.ts`**
   - Added `storageKey: 'sb-auth-token'` to direct client creation

3. **`app/dashboard/admin/tools/page.tsx`**
   - Updated all 5 direct Supabase client creations
   - All now use `storageKey: 'sb-auth-token'`

---

## ✅ Next Steps

1. **Verify Contract-Management-System:**
   - Find Supabase client file
   - Add `storageKey: 'sb-auth-token'` configuration
   - Test SSO

2. **Test SSO:**
   - Login on one platform
   - Verify automatic login on others

3. **Production Deployment:**
   - Ensure all platforms have the same configuration
   - Test in production environment

---

## 🔗 Related Files

- `utils/supabase/client.ts` - Main client configuration
- `scripts/verify-sso-config.js` - Verification script
- `app/auth/callback/route.ts` - Auth callback handler
- `app/dashboard/admin/tools/page.tsx` - Admin tools (updated)

---

**Last Updated:** After SSO configuration update
**Status:** business-services-hub ✅ | BusinessHub ✅ | Contract-Management-System ⚠️

