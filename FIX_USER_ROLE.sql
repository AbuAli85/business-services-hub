-- Fix User Role - Run this if you need to update your role to admin
-- Replace 'your-email@example.com' with your actual email

-- 1. Check your current profile
SELECT 
  id,
  email,
  role,
  full_name
FROM profiles 
WHERE email = 'your-email@example.com';

-- 2. Update your role to admin (replace the email)
UPDATE profiles 
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- 3. Verify the update
SELECT 
  id,
  email,
  role,
  full_name
FROM profiles 
WHERE email = 'your-email@example.com';

-- 4. Alternative: Update by user ID (if you know your auth.uid())
-- UPDATE profiles 
-- SET role = 'admin'
-- WHERE id = auth.uid();

-- 5. Test the RLS condition again
SELECT 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ) as can_insert_notifications;

-- 6. If you need to create a profile entry (if it doesn't exist)
-- INSERT INTO profiles (
--   id,
--   email,
--   role,
--   full_name,
--   created_at,
--   updated_at
-- ) VALUES (
--   auth.uid(),
--   'your-email@example.com',
--   'admin',
--   'Your Name',
--   NOW(),
--   NOW()
-- ) ON CONFLICT (id) DO UPDATE SET
--   role = EXCLUDED.role,
--   updated_at = NOW();
