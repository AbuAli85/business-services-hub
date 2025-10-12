# Verify Service Role Key Configuration

## 🔑 **Critical Requirement**

The audit log API uses **Supabase Service Role Key** to bypass RLS. This key **MUST** be configured in Vercel environment variables.

---

## ✅ **Step 1: Get Service Role Key from Supabase**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Find **"Service Role Key"** (NOT anon key)
3. Click "Copy" - it starts with `eyJ...` and is VERY long
4. ⚠️ **IMPORTANT**: This key has admin access - keep it secret!

---

## ✅ **Step 2: Add to Vercel Environment Variables**

1. Go to: https://vercel.com/dashboard (your project)
2. Click **"Settings"** → **"Environment Variables"**
3. Add new variable:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `eyJ...` (paste the service role key)
   - **Environments**: Check all (Production, Preview, Development)
4. Click **"Save"**

---

## ✅ **Step 3: Redeploy**

After adding the environment variable, you MUST redeploy:

### **Option A: Trigger New Deployment**
1. Go to **"Deployments"** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait for green checkmark ✅

### **Option B: Push Empty Commit**
```bash
git commit --allow-empty -m "chore: Trigger redeployment for service role key"
git push
```

---

## ✅ **Step 4: Verify**

After redeployment:

1. **Hard refresh browser**: `Ctrl + Shift + R`
2. **Approve a service**
3. **Check console** for:
   ```
   📝 Creating audit log via API: {serviceId: "...", event: "Approved"}
   ✅ Audit log created for service: [id] Action: Approved ID: [uuid]
   ```
4. **Check database**:
   ```sql
   SELECT * FROM service_audit_logs 
   WHERE event = 'Approved'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

## 🚨 **If Still Failing**

### **Check Environment Variables**
In Vercel, verify these are set:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` ← **Critical for audit logs**
- ✅ `RESEND_API_KEY`

### **Check Console Errors**
If you see:
```
Error creating audit log: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
```
→ The key wasn't added or deployment didn't pick it up. Redeploy!

---

## 🎯 **Why Service Role Key?**

| Client Type | RLS | Use Case |
|-------------|-----|----------|
| **Anon Key** | ✅ Enforced | User-facing operations |
| **Service Role Key** | ❌ Bypassed | Admin operations, system logs |

**Audit logs** are administrative/system logs, not user data. They're written by admins and only readable by authorized users. Using the service role key:
- ✅ Bypasses RLS authentication issues
- ✅ Simpler, more reliable
- ✅ Industry standard for system logs
- ✅ Still secure (server-side validation of admin role)

---

## 📊 **Complete Checklist**

- [ ] Service role key copied from Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Vercel
- [ ] All environments selected (Production, Preview, Development)
- [ ] Redeployment triggered
- [ ] Green checkmark ✅ on deployment
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Test approval shows "✅ Audit log created"
- [ ] Database shows new audit log entry

---

**Once all checkmarks are done, the audit log system will work perfectly!** 🚀

