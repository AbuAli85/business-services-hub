-- Test query to check client company data
-- Based on the user's feedback, we need to find the client "Fahad alamri" and their company data

-- First, let's find the client profile
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  p.company_name as profile_company_name
FROM profiles p 
WHERE p.full_name ILIKE '%fahad%alamri%' 
   OR p.email ILIKE '%falconeyegroup%';

-- Then check if there's a company record for this profile
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  c.id as company_id,
  c.name as company_name,
  c.address,
  c.website,
  c.owner_id
FROM profiles p 
LEFT JOIN companies c ON c.owner_id = p.id
WHERE p.full_name ILIKE '%fahad%alamri%' 
   OR p.email ILIKE '%falconeyegroup%';

-- Also check if there are any companies with "falcon" in the name
SELECT 
  c.id,
  c.name,
  c.address,
  c.website,
  c.owner_id,
  p.full_name as owner_name
FROM companies c
LEFT JOIN profiles p ON p.id = c.owner_id
WHERE c.name ILIKE '%falcon%';
