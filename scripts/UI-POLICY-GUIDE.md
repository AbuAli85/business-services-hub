# 📋 UI Policy Guide - If SQL Fails

If you get **"must be owner of table objects"** error, use the Supabase Dashboard UI instead.

---

## 🚀 Quick Steps

### **For Each Bucket (task-files, booking-files, milestone-files):**

1. Go to **Supabase Dashboard** → **Storage**
2. Click on the bucket name
3. Click **"Policies"** tab
4. Click **"New Policy"** button

---

## 📝 Policy Templates (Copy/Paste)

### **Policy 1: Allow Upload (INSERT)**

```
Policy name: Allow uploads to [bucket-name]
Allowed operation: ☑ INSERT
Target roles: authenticated

WITH CHECK expression:
bucket_id = '[bucket-name]'
```

Replace `[bucket-name]` with: `task-files`, `booking-files`, or `milestone-files`

---

### **Policy 2: Allow Read (SELECT)**

```
Policy name: Public read [bucket-name]
Allowed operation: ☑ SELECT
Target roles: public

USING expression:
bucket_id = '[bucket-name]'
```

---

### **Policy 3: Allow Delete (DELETE)**

```
Policy name: Allow delete [bucket-name]
Allowed operation: ☑ DELETE
Target roles: authenticated

USING expression:
bucket_id = '[bucket-name]'
```

---

## ✅ Expected Result

After adding policies, each bucket should show:

```
✓ Allow uploads to [bucket-name] (INSERT - authenticated)
✓ Public read [bucket-name] (SELECT - public)
✓ Allow delete [bucket-name] (DELETE - authenticated)
```

---

## 🎯 Total Policies Needed

- **task-files:** 3 policies
- **booking-files:** 3 policies
- **milestone-files:** 3 policies

**Total:** 9 policies

---

## 🚀 After Adding All Policies

1. Refresh your browser
2. Try uploading files
3. Should work! ✅


