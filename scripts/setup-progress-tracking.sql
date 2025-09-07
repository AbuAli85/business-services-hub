-- Setup Progress Tracking for Existing Bookings
-- This script creates milestones and tasks for all existing bookings

-- First, let's see what bookings we have
SELECT 
  id, 
  title, 
  status, 
  service_id,
  project_progress,
  created_at
FROM public.bookings 
ORDER BY created_at DESC;

-- Create milestones for SEO Service bookings
INSERT INTO public.milestones (
  booking_id, title, description, weight, estimated_hours, order_index, 
  status, due_date, created_at, updated_at
)
SELECT 
  b.id as booking_id,
  milestone_data.title,
  milestone_data.description,
  milestone_data.weight,
  milestone_data.estimated_hours,
  milestone_data.order_index,
  CASE 
    WHEN milestone_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  (b.created_at + INTERVAL '1 week' * (milestone_data.order_index + 1)) as due_date,
  now() as created_at,
  now() as updated_at
FROM public.bookings b
CROSS JOIN (
  VALUES 
    (0, 'Initial Analysis & Research', 'Conduct comprehensive SEO audit and keyword research', 1.0, 8),
    (1, 'On-Page Optimization', 'Optimize website structure, content, and meta tags', 1.5, 12),
    (2, 'Technical SEO Implementation', 'Fix technical issues and improve site performance', 1.2, 10),
    (3, 'Content Strategy & Creation', 'Develop content calendar and create optimized content', 1.3, 15),
    (4, 'Link Building & Outreach', 'Build quality backlinks and establish authority', 1.0, 8),
    (5, 'Monitoring & Reporting', 'Track progress and provide detailed reports', 0.8, 6)
) AS milestone_data(order_index, title, description, weight, estimated_hours)
WHERE b.service_id = '3dcbbcfb-fe1e-426d-b5d5-67d35314a4be' -- SEO Service
  AND NOT EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.booking_id = b.id
  );

-- Create milestones for Digital Marketing bookings
INSERT INTO public.milestones (
  booking_id, title, description, weight, estimated_hours, order_index, 
  status, due_date, created_at, updated_at
)
SELECT 
  b.id as booking_id,
  milestone_data.title,
  milestone_data.description,
  milestone_data.weight,
  milestone_data.estimated_hours,
  milestone_data.order_index,
  CASE 
    WHEN milestone_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  (b.created_at + INTERVAL '1 week' * (milestone_data.order_index + 1)) as due_date,
  now() as created_at,
  now() as updated_at
FROM public.bookings b
CROSS JOIN (
  VALUES 
    (0, 'Strategy Development', 'Create comprehensive digital marketing strategy', 1.0, 10),
    (1, 'Campaign Setup', 'Set up advertising campaigns across platforms', 1.2, 12),
    (2, 'Content Creation', 'Create engaging content for all channels', 1.5, 20),
    (3, 'Social Media Management', 'Manage social media presence and engagement', 1.0, 8),
    (4, 'Performance Optimization', 'Optimize campaigns based on performance data', 1.0, 8),
    (5, 'Analytics & Reporting', 'Analyze results and provide insights', 0.8, 6)
) AS milestone_data(order_index, title, description, weight, estimated_hours)
WHERE b.service_id = '6febf331-d950-4b66-a2d3-6ef772f28834' -- Digital Marketing
  AND NOT EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.booking_id = b.id
  );

-- Create milestones for Translation Services bookings
INSERT INTO public.milestones (
  booking_id, title, description, weight, estimated_hours, order_index, 
  status, due_date, created_at, updated_at
)
SELECT 
  b.id as booking_id,
  milestone_data.title,
  milestone_data.description,
  milestone_data.weight,
  milestone_data.estimated_hours,
  milestone_data.order_index,
  CASE 
    WHEN milestone_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  (b.created_at + INTERVAL '1 week' * (milestone_data.order_index + 1)) as due_date,
  now() as created_at,
  now() as updated_at
FROM public.bookings b
CROSS JOIN (
  VALUES 
    (0, 'Document Analysis', 'Review and analyze source documents', 1.0, 4),
    (1, 'Translation Phase 1', 'Initial translation of core content', 1.5, 12),
    (2, 'Quality Review', 'Review and edit translated content', 1.0, 6),
    (3, 'Translation Phase 2', 'Complete remaining translations', 1.2, 8),
    (4, 'Final Proofreading', 'Final proofreading and quality assurance', 0.8, 4),
    (5, 'Delivery & Feedback', 'Deliver final documents and gather feedback', 0.5, 2)
) AS milestone_data(order_index, title, description, weight, estimated_hours)
WHERE b.service_id = '770e8400-e29b-41d4-a716-446655440007' -- Translation Services
  AND NOT EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.booking_id = b.id
  );

-- Create milestones for PRO services bookings
INSERT INTO public.milestones (
  booking_id, title, description, weight, estimated_hours, order_index, 
  status, due_date, created_at, updated_at
)
SELECT 
  b.id as booking_id,
  milestone_data.title,
  milestone_data.description,
  milestone_data.weight,
  milestone_data.estimated_hours,
  milestone_data.order_index,
  CASE 
    WHEN milestone_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  (b.created_at + INTERVAL '1 week' * (milestone_data.order_index + 1)) as due_date,
  now() as created_at,
  now() as updated_at
FROM public.bookings b
CROSS JOIN (
  VALUES 
    (0, 'Requirements Gathering', 'Collect and analyze client requirements', 1.0, 6),
    (1, 'Project Planning', 'Create detailed project plan and timeline', 0.8, 4),
    (2, 'Development Phase 1', 'Core development and implementation', 1.5, 20),
    (3, 'Testing & Quality Assurance', 'Comprehensive testing and bug fixes', 1.0, 8),
    (4, 'Development Phase 2', 'Additional features and refinements', 1.2, 12),
    (5, 'Deployment & Handover', 'Deploy solution and provide documentation', 0.8, 6)
) AS milestone_data(order_index, title, description, weight, estimated_hours)
WHERE b.service_id = 'd59a77bb-100a-4bb3-9755-ccb4b07ba06b' -- PRO services
  AND NOT EXISTS (
    SELECT 1 FROM public.milestones m WHERE m.booking_id = b.id
  );

-- Now create tasks for each milestone
-- SEO Service tasks
INSERT INTO public.tasks (
  milestone_id, title, description, status, order_index, estimated_hours, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.order_index,
  task_data.estimated_hours,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
JOIN public.bookings b ON m.booking_id = b.id
CROSS JOIN (
  VALUES 
    (0, 'Conduct website audit', 'Analyze current SEO performance', 2),
    (1, 'Keyword research', 'Identify target keywords and search volume', 3),
    (2, 'Competitor analysis', 'Analyze competitor SEO strategies', 3),
    (3, 'Meta tag optimization', 'Optimize title tags and meta descriptions', 2),
    (4, 'Content optimization', 'Improve existing content for SEO', 4),
    (5, 'Fix crawl errors', 'Resolve technical SEO issues', 3),
    (6, 'Improve site speed', 'Optimize page loading times', 2),
    (7, 'Mobile optimization', 'Ensure mobile-friendly design', 2),
    (8, 'Schema markup', 'Implement structured data', 3),
    (9, 'Content calendar creation', 'Plan content publishing schedule', 4),
    (10, 'Blog post writing', 'Create SEO-optimized blog content', 6),
    (11, 'Page content updates', 'Update existing page content', 5),
    (12, 'Link prospecting', 'Find high-quality link opportunities', 3),
    (13, 'Outreach campaigns', 'Contact websites for link building', 4),
    (14, 'Guest posting', 'Write and publish guest articles', 1),
    (15, 'Performance tracking', 'Monitor SEO metrics and KPIs', 2),
    (16, 'Monthly reports', 'Create detailed progress reports', 2),
    (17, 'Client communication', 'Update client on progress', 2)
) AS task_data(order_index, title, description, estimated_hours)
WHERE b.service_id = '3dcbbcfb-fe1e-426d-b5d5-67d35314a4be'
  AND m.order_index = 0 -- First milestone
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- Digital Marketing tasks
INSERT INTO public.tasks (
  milestone_id, title, description, status, order_index, estimated_hours, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.order_index,
  task_data.estimated_hours,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
JOIN public.bookings b ON m.booking_id = b.id
CROSS JOIN (
  VALUES 
    (0, 'Market research', 'Analyze target market and trends', 3),
    (1, 'Target audience analysis', 'Define buyer personas', 2),
    (2, 'Competitor analysis', 'Study competitor strategies', 2),
    (3, 'Ad account setup', 'Create and configure ad accounts', 2),
    (4, 'Campaign configuration', 'Set up advertising campaigns', 4),
    (5, 'Budget allocation', 'Distribute budget across channels', 1),
    (6, 'Video production', 'Create marketing videos', 8),
    (7, 'Graphic design', 'Design marketing materials', 6),
    (8, 'Copywriting', 'Write compelling ad copy', 4),
    (9, 'Content scheduling', 'Plan content calendar', 2),
    (10, 'Platform management', 'Manage social media accounts', 3),
    (11, 'Community engagement', 'Engage with followers and customers', 3),
    (12, 'Influencer outreach', 'Connect with industry influencers', 2),
    (13, 'A/B testing', 'Test different ad variations', 3),
    (14, 'Performance analysis', 'Analyze campaign performance', 2),
    (15, 'Budget optimization', 'Optimize spend across channels', 3),
    (16, 'ROI analysis', 'Calculate return on investment', 2),
    (17, 'Client reporting', 'Create performance reports', 2),
    (18, 'Recommendations', 'Provide optimization recommendations', 2)
) AS task_data(order_index, title, description, estimated_hours)
WHERE b.service_id = '6febf331-d950-4b66-a2d3-6ef772f28834'
  AND m.order_index = 0 -- First milestone
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- Translation Services tasks
INSERT INTO public.tasks (
  milestone_id, title, description, status, order_index, estimated_hours, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.order_index,
  task_data.estimated_hours,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
JOIN public.bookings b ON m.booking_id = b.id
CROSS JOIN (
  VALUES 
    (0, 'Document review', 'Review source documents', 1),
    (1, 'Terminology research', 'Research industry-specific terms', 1),
    (2, 'Style guide creation', 'Create translation style guide', 2),
    (3, 'Core content translation', 'Translate main content', 6),
    (4, 'Technical translation', 'Translate technical sections', 4),
    (5, 'Cultural adaptation', 'Adapt content for target culture', 2),
    (6, 'Quality check', 'Review translation quality', 2),
    (7, 'Consistency review', 'Ensure terminology consistency', 2),
    (8, 'Accuracy verification', 'Verify translation accuracy', 2),
    (9, 'Remaining content translation', 'Complete remaining translations', 4),
    (10, 'Formatting', 'Format translated documents', 2),
    (11, 'Layout adjustment', 'Adjust layout for target language', 2),
    (12, 'Final proofreading', 'Final proofreading pass', 2),
    (13, 'Grammar check', 'Check grammar and syntax', 1),
    (14, 'Style consistency', 'Ensure consistent style', 1),
    (15, 'Document formatting', 'Format final documents', 1),
    (16, 'Client delivery', 'Deliver completed translation', 1),
    (17, 'Feedback collection', 'Gather client feedback', 1)
) AS task_data(order_index, title, description, estimated_hours)
WHERE b.service_id = '770e8400-e29b-41d4-a716-446655440007'
  AND m.order_index = 0 -- First milestone
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- PRO services tasks
INSERT INTO public.tasks (
  milestone_id, title, description, status, order_index, estimated_hours, created_at, updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.order_index = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.order_index,
  task_data.estimated_hours,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
JOIN public.bookings b ON m.booking_id = b.id
CROSS JOIN (
  VALUES 
    (0, 'Client interviews', 'Conduct requirement interviews', 2),
    (1, 'Requirements documentation', 'Document all requirements', 2),
    (2, 'Scope definition', 'Define project scope', 2),
    (3, 'Project timeline creation', 'Create detailed timeline', 1),
    (4, 'Resource allocation', 'Assign team members', 1),
    (5, 'Risk assessment', 'Identify and assess risks', 2),
    (6, 'Core functionality development', 'Develop main features', 10),
    (7, 'Database design', 'Design database schema', 4),
    (8, 'API integration', 'Integrate with external APIs', 6),
    (9, 'Unit testing', 'Test individual components', 3),
    (10, 'Integration testing', 'Test system integration', 3),
    (11, 'Bug fixing', 'Fix identified issues', 2),
    (12, 'Feature enhancements', 'Add additional features', 6),
    (13, 'Performance optimization', 'Optimize system performance', 4),
    (14, 'Security implementation', 'Implement security measures', 2),
    (15, 'Documentation creation', 'Create user documentation', 3),
    (16, 'User training', 'Train end users', 2),
    (17, 'Deployment', 'Deploy to production', 1)
) AS task_data(order_index, title, description, estimated_hours)
WHERE b.service_id = 'd59a77bb-100a-4bb3-9755-ccb4b07ba06b'
  AND m.order_index = 0 -- First milestone
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- Update milestone progress for all created milestones
DO $$
DECLARE
  milestone_record RECORD;
BEGIN
  FOR milestone_record IN 
    SELECT id FROM public.milestones 
    WHERE created_at > now() - INTERVAL '1 hour'
  LOOP
    PERFORM update_milestone_progress(milestone_record.id);
  END LOOP;
END $$;

-- Update booking progress for all affected bookings
DO $$
DECLARE
  booking_record RECORD;
BEGIN
  FOR booking_record IN 
    SELECT DISTINCT b.id 
    FROM public.bookings b
    JOIN public.milestones m ON b.id = m.booking_id
    WHERE m.created_at > now() - INTERVAL '1 hour'
  LOOP
    PERFORM calculate_booking_progress(booking_record.id);
  END LOOP;
END $$;

-- Show summary of what was created
SELECT 
  'Milestones Created' as type,
  COUNT(*) as count
FROM public.milestones 
WHERE created_at > now() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Tasks Created' as type,
  COUNT(*) as count
FROM public.tasks 
WHERE created_at > now() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Bookings Updated' as type,
  COUNT(DISTINCT booking_id) as count
FROM public.milestones 
WHERE created_at > now() - INTERVAL '1 hour';
