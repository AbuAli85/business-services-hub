-- Clean up duplicate milestones in the database
-- This script removes duplicate milestones, keeping only the first occurrence

-- First, let's see what we have
SELECT 
    title, 
    COUNT(*) as count,
    booking_id
FROM public.milestones 
WHERE booking_id = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
GROUP BY title, booking_id
ORDER BY count DESC;

-- Delete duplicate milestones, keeping only the first occurrence (oldest created_at)
WITH ranked_milestones AS (
    SELECT 
        id,
        title,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY title, booking_id 
            ORDER BY created_at ASC
        ) as rn
    FROM public.milestones 
    WHERE booking_id = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
)
DELETE FROM public.milestones 
WHERE id IN (
    SELECT id 
    FROM ranked_milestones 
    WHERE rn > 1
);

-- Verify the cleanup
SELECT 
    title, 
    COUNT(*) as count,
    booking_id
FROM public.milestones 
WHERE booking_id = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
GROUP BY title, booking_id
ORDER BY count DESC;

-- Show remaining milestones
SELECT 
    id,
    title,
    status,
    created_at
FROM public.milestones 
WHERE booking_id = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
ORDER BY created_at ASC;
