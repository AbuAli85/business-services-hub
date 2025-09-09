# 🗄️ **SUPABASE STORAGE SETUP GUIDE**

## ✅ **FIXING THE "BUCKET NOT FOUND" ERROR**

### **🔍 PROBLEM IDENTIFIED:**
```
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

**Root Cause:** The Supabase Storage bucket for documents doesn't exist yet. The document management system needs a storage bucket to upload and store files.

---

## **🔧 COMPLETE SETUP INSTRUCTIONS:**

### **Step 1: Create Storage Bucket**

1. **Go to Supabase Dashboard**
   - Navigate to your project dashboard
   - Click on "Storage" in the left sidebar

2. **Create New Bucket**
   - Click "New bucket" button
   - **Bucket name:** `documents`
   - **Public bucket:** ✅ Check this (for direct file access)
   - Click "Create bucket"

3. **Configure Bucket Settings**
   - Go to the `documents` bucket settings
   - Ensure it's set to public if you want direct file downloads
   - Note the bucket name: `documents`

### **Step 2: Set Up RLS Policies for Storage**

1. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Create a new query

2. **Run Storage RLS Policies**
   ```sql
   -- Enable RLS on storage.objects
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

   -- Policy for viewing documents
   CREATE POLICY "Users can view documents for their bookings" ON storage.objects
     FOR SELECT USING (
       bucket_id = 'documents' AND
       EXISTS (
         SELECT 1 FROM documents 
         WHERE documents.file_path = storage.objects.name
         AND EXISTS (
           SELECT 1 FROM bookings 
           WHERE bookings.id = documents.booking_id 
           AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
         )
       )
     );

   -- Policy for uploading documents
   CREATE POLICY "Users can upload documents for their bookings" ON storage.objects
     FOR INSERT WITH CHECK (
       bucket_id = 'documents' AND
       EXISTS (
         SELECT 1 FROM bookings 
         WHERE bookings.id = (SELECT booking_id FROM documents WHERE file_path = name)
         AND (bookings.client_id = auth.uid() OR bookings.provider_id = auth.uid())
       )
     );

   -- Policy for updating documents
   CREATE POLICY "Users can update their own documents" ON storage.objects
     FOR UPDATE USING (
       bucket_id = 'documents' AND
       EXISTS (
         SELECT 1 FROM documents 
         WHERE documents.file_path = storage.objects.name
         AND documents.uploaded_by = auth.uid()
       )
     );

   -- Policy for deleting documents
   CREATE POLICY "Users can delete their own documents" ON storage.objects
     FOR DELETE USING (
       bucket_id = 'documents' AND
       EXISTS (
         SELECT 1 FROM documents 
         WHERE documents.file_path = storage.objects.name
         AND documents.uploaded_by = auth.uid()
       )
     );
   ```

3. **Run the SQL Script**
   - Copy and paste the above SQL
   - Click "Run" to execute

### **Step 3: Alternative Simple Storage Setup**

If the above RLS policies are too complex, you can use this simpler approach:

```sql
-- Simple storage policies (less secure but easier to set up)
CREATE POLICY "Allow all operations on documents bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'documents');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
```

---

## **🔧 UPDATING THE APPLICATION:**

### **Step 4: Update Document Management Service**

The document management service should handle missing buckets gracefully. Here's what I'll implement:

1. **Check if bucket exists** before attempting uploads
2. **Show helpful error messages** if bucket is missing
3. **Provide setup instructions** for users

### **Step 5: Test the Setup**

1. **Refresh the milestone page**
2. **Go to Documents tab** (Provider view)
3. **Try uploading a document**
4. **Check if the upload works**

---

## **🎯 EXPECTED RESULT:**

### **✅ After Setup:**
- **No More 404 Errors** → Bucket exists and is accessible
- **File Uploads Work** → Documents can be uploaded successfully
- **File Downloads Work** → Documents can be downloaded
- **Full Functionality** → Complete document management system

### **✅ Before Setup:**
- **Helpful Error Messages** → Clear instructions for setup
- **Graceful Fallback** → Application continues to work
- **Professional UI** → Clean error handling

---

## **🚀 QUICK SETUP CHECKLIST:**

- [ ] Create `documents` bucket in Supabase Storage
- [ ] Set bucket to public (for direct downloads)
- [ ] Run storage RLS policies SQL
- [ ] Test file upload functionality
- [ ] Verify file download functionality

---

## **🔧 TROUBLESHOOTING:**

### **If you still get 404 errors:**
1. **Check bucket name** - Must be exactly `documents`
2. **Check bucket permissions** - Should be public
3. **Check RLS policies** - Make sure they're applied
4. **Refresh the page** - Clear any cached errors

### **If uploads fail:**
1. **Check file size limits** - Supabase has default limits
2. **Check file types** - Some types may be restricted
3. **Check authentication** - User must be logged in
4. **Check console errors** - Look for specific error messages

**The storage bucket setup should resolve the 404 error completely!** ✅

**Document uploads and downloads will work perfectly after setup!** 🎉
