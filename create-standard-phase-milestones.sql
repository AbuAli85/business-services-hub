-- create-standard-phase-milestones.sql
-- This script creates the standard 4 phases with fixed UUIDs for the 4-phase system

-- Insert standard phase milestones if they don't exist
-- These will be used as templates for all projects

INSERT INTO public.milestones (
  id,
  booking_id,
  title,
  description,
  status,
  due_date,
  created_at,
  updated_at,
  progress_percentage,
  estimated_hours
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001', -- Planning & Setup UUID
    '8ccbb969-3639-4ff4-ae4d-722d9580db57', -- Use the existing booking ID
    'Planning & Setup',
    'Initial planning, requirements gathering, and project setup',
    'not_started',
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW(),
    0,
    0
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002', -- Development UUID
    '8ccbb969-3639-4ff4-ae4d-722d9580db57',
    'Development',
    'Core development work and implementation',
    'not_started',
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW(),
    0,
    0
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003', -- Testing & Quality UUID
    '8ccbb969-3639-4ff4-ae4d-722d9580db57',
    'Testing & Quality',
    'Testing, quality assurance, and bug fixes',
    'not_started',
    NOW() + INTERVAL '21 days',
    NOW(),
    NOW(),
    0,
    0
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004', -- Delivery & Launch UUID
    '8ccbb969-3639-4ff4-ae4d-722d9580db57',
    'Delivery & Launch',
    'Final delivery, deployment, and project launch',
    'not_started',
    NOW() + INTERVAL '28 days',
    NOW(),
    NOW(),
    0,
    0
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  due_date = EXCLUDED.due_date,
  updated_at = NOW();

-- Update any existing milestones to use the standard phase titles if they match
UPDATE public.milestones 
SET 
  title = CASE 
    WHEN title ILIKE '%planning%' OR title ILIKE '%setup%' THEN 'Planning & Setup'
    WHEN title ILIKE '%development%' OR title ILIKE '%develop%' THEN 'Development'
    WHEN title ILIKE '%testing%' OR title ILIKE '%quality%' THEN 'Testing & Quality'
    WHEN title ILIKE '%delivery%' OR title ILIKE '%launch%' THEN 'Delivery & Launch'
    ELSE title
  END,
  updated_at = NOW()
WHERE booking_id = '8ccbb969-3639-4ff4-ae4d-722d9580db57';

-- Ensure we have exactly 4 milestones for this booking
-- Delete any extra milestones beyond the 4 standard phases
DELETE FROM public.milestones 
WHERE booking_id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
AND id NOT IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004'
);
