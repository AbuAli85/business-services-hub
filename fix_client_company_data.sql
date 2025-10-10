-- Fix client company data for Fahad alamri / falcon eye group
-- Based on the user's feedback, we need to ensure the company data is properly linked

-- First, let's check what we have
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  p.company_name,
  c.id as company_id,
  c.name as company_name_db,
  c.address,
  c.website,
  c.owner_id
FROM profiles p 
LEFT JOIN companies c ON c.owner_id = p.id
WHERE p.full_name ILIKE '%fahad%alamri%' 
   OR p.email ILIKE '%falconeyegroup%'
   OR p.email = 'chairman@falconeyegroup.net';

-- Update the company record with the correct data
-- First, let's find the profile ID for Fahad alamri
WITH client_profile AS (
  SELECT id, full_name, email, company_name
  FROM profiles 
  WHERE email = 'chairman@falconeyegroup.net'
  OR (full_name ILIKE '%fahad%alamri%' AND email ILIKE '%falconeyegroup%')
  LIMIT 1
)
UPDATE companies 
SET 
  name = 'falcon eye group',
  address = 'PO. Box 762, PC. 122, Al Khuwair',
  website = 'www.falconeyegroup.net',
  phone = '95153930',
  email = 'chairman@falconeyegroup.net',
  updated_at = NOW()
WHERE owner_id = (SELECT id FROM client_profile);

-- If no company record exists, create one
WITH client_profile AS (
  SELECT id, full_name, email, company_name
  FROM profiles 
  WHERE email = 'chairman@falconeyegroup.net'
  OR (full_name ILIKE '%fahad%alamri%' AND email ILIKE '%falconeyegroup%')
  LIMIT 1
)
INSERT INTO companies (
  owner_id,
  name,
  address,
  phone,
  email,
  website,
  created_at,
  updated_at
)
SELECT 
  id,
  'falcon eye group',
  'PO. Box 762, PC. 122, Al Khuwair',
  '95153930',
  'chairman@falconeyegroup.net',
  'www.falconeyegroup.net',
  NOW(),
  NOW()
FROM client_profile
WHERE NOT EXISTS (
  SELECT 1 FROM companies WHERE owner_id = client_profile.id
);

-- Verify the fix
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  p.company_name,
  c.id as company_id,
  c.name as company_name_db,
  c.address,
  c.website,
  c.phone,
  c.owner_id
FROM profiles p 
LEFT JOIN companies c ON c.owner_id = p.id
WHERE p.email = 'chairman@falconeyegroup.net'
   OR (p.full_name ILIKE '%fahad%alamri%' AND p.email ILIKE '%falconeyegroup%');
