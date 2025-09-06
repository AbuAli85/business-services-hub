-- Fix duplicate service titles by deactivating duplicates
-- This script will keep the first occurrence of each title per category
-- and deactivate the duplicates

-- First, let's see what duplicates we have
SELECT 
  category_id,
  title,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY sort_order, created_at) as ids
FROM service_titles 
WHERE is_active = true
GROUP BY category_id, title
HAVING COUNT(*) > 1
ORDER BY category_id, title;

-- Now let's create a temporary table with the IDs to keep (first occurrence of each duplicate)
WITH duplicates_to_keep AS (
  SELECT DISTINCT ON (category_id, title)
    id,
    category_id,
    title
  FROM service_titles 
  WHERE is_active = true
  ORDER BY category_id, title, sort_order, created_at
),
duplicates_to_remove AS (
  SELECT st.id
  FROM service_titles st
  WHERE st.is_active = true
    AND EXISTS (
      SELECT 1 
      FROM duplicates_to_keep dtk 
      WHERE dtk.category_id = st.category_id 
        AND dtk.title = st.title 
        AND dtk.id != st.id
    )
)
-- Deactivate the duplicate titles (keep the first occurrence)
UPDATE service_titles 
SET is_active = false
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Verify the fix by checking for remaining duplicates
SELECT 
  category_id,
  title,
  COUNT(*) as count
FROM service_titles 
WHERE is_active = true
GROUP BY category_id, title
HAVING COUNT(*) > 1
ORDER BY category_id, title;

-- Show final count of active titles
SELECT COUNT(*) as total_active_titles FROM service_titles WHERE is_active = true;
