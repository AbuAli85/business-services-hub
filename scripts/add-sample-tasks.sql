-- Add Sample Tasks to Existing Milestones
-- This script adds realistic tasks to milestones for demonstration

-- 1. Add tasks for SEO Service milestones
INSERT INTO public.tasks (
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index,
  created_at,
  updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.milestone_order = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.milestone_order,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  -- Initial Analysis & Research tasks
  VALUES 
    (0, 'Conduct SEO Audit', 'Perform comprehensive technical SEO audit using tools like Screaming Frog', 'high', 2.0),
    (1, 'Keyword Research', 'Research primary and secondary keywords for target market', 'high', 2.0),
    (2, 'Competitor Analysis', 'Analyze top 5 competitors and their SEO strategies', 'medium', 1.5),
    (3, 'Content Gap Analysis', 'Identify content opportunities and gaps', 'medium', 1.5),
    (4, 'Technical Assessment', 'Review site speed, mobile-friendliness, and crawlability', 'high', 1.0),
    
    -- On-Page Optimization tasks  
    (5, 'Title Tag Optimization', 'Optimize all page title tags for target keywords', 'high', 1.0),
    (6, 'Meta Description Updates', 'Write compelling meta descriptions for key pages', 'medium', 1.0),
    (7, 'Header Structure Fix', 'Fix H1, H2, H3 hierarchy and keyword placement', 'high', 1.5),
    (8, 'Internal Linking Strategy', 'Implement strategic internal linking structure', 'medium', 2.0),
    (9, 'Image Alt Text Optimization', 'Add descriptive alt text to all images', 'low', 1.0),
    (10, 'Schema Markup Implementation', 'Add structured data markup for better SERP display', 'high', 2.0),
    
    -- Content Optimization tasks
    (11, 'Content Audit', 'Review and analyze existing content quality', 'high', 2.0),
    (12, 'Keyword Integration', 'Integrate target keywords naturally into content', 'high', 2.5),
    (13, 'Content Freshness Update', 'Update outdated content with current information', 'medium', 1.5),
    (14, 'Call-to-Action Optimization', 'Improve CTAs for better conversion rates', 'medium', 1.0),
    (15, 'Content Length Optimization', 'Ensure content meets optimal length requirements', 'low', 1.0),
    
    -- Technical SEO tasks
    (16, 'Site Speed Optimization', 'Improve Core Web Vitals and page load times', 'high', 3.0),
    (17, 'Mobile Optimization', 'Ensure perfect mobile experience and responsiveness', 'high', 2.0),
    (18, 'XML Sitemap Update', 'Create and submit updated XML sitemap', 'medium', 0.5),
    (19, 'Robots.txt Optimization', 'Review and optimize robots.txt file', 'low', 0.5),
    (20, 'SSL Certificate Check', 'Ensure HTTPS is properly implemented', 'high', 0.5),
    
    -- Link Building tasks
    (21, 'Local Citation Building', 'Build local business citations and directories', 'medium', 2.0),
    (22, 'Guest Post Outreach', 'Identify and reach out to relevant websites', 'high', 3.0),
    (23, 'Broken Link Building', 'Find and fix broken links for link opportunities', 'medium', 1.5),
    (24, 'Resource Page Outreach', 'Identify resource pages for link building', 'medium', 2.0),
    (25, 'Local Link Building', 'Build local community and business links', 'medium', 1.5),
    
    -- Monitoring & Reporting tasks
    (26, 'Analytics Setup', 'Configure Google Analytics and Search Console', 'high', 1.0),
    (27, 'Ranking Tracking Setup', 'Set up keyword ranking monitoring tools', 'high', 1.0),
    (28, 'Performance Baseline', 'Establish current performance benchmarks', 'high', 1.0),
    (29, 'Monthly Report Creation', 'Create comprehensive monthly SEO reports', 'medium', 2.0),
    (30, 'Client Communication', 'Schedule regular check-ins and progress updates', 'medium', 1.0)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id IN (
    SELECT id FROM public.bookings 
    WHERE service_id = '3dcbbcfb-fe1e-426d-b5d5-67d35314a4be' -- SEO Service
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 2. Add tasks for Digital Marketing Service milestones
INSERT INTO public.tasks (
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index,
  created_at,
  updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.milestone_order = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.milestone_order,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  -- Strategy Development tasks
  VALUES 
    (0, 'Market Research', 'Conduct comprehensive market and competitor analysis', 'high', 3.0),
    (1, 'Target Audience Definition', 'Define detailed buyer personas and customer journey', 'high', 2.0),
    (2, 'Brand Positioning', 'Develop unique value proposition and brand messaging', 'high', 2.5),
    (3, 'Channel Strategy', 'Identify optimal marketing channels for target audience', 'high', 2.0),
    (4, 'Budget Allocation', 'Create detailed budget distribution across channels', 'medium', 1.0),
    
    -- Content Creation tasks
    (5, 'Content Calendar Development', 'Create 3-month content calendar and themes', 'high', 2.0),
    (6, 'Blog Content Creation', 'Write 8-12 high-quality blog posts', 'high', 4.0),
    (7, 'Social Media Content', 'Create engaging social media posts and graphics', 'high', 3.0),
    (8, 'Video Content Production', 'Plan and produce marketing videos', 'medium', 4.0),
    (9, 'Email Newsletter Setup', 'Design and set up email marketing templates', 'medium', 2.0),
    (10, 'Case Study Development', 'Create compelling customer success stories', 'high', 2.5),
    
    -- Social Media Management tasks
    (11, 'Platform Optimization', 'Optimize all social media profiles and bios', 'high', 1.5),
    (12, 'Content Scheduling', 'Set up automated posting schedule', 'medium', 1.0),
    (13, 'Community Engagement', 'Develop engagement strategy and response guidelines', 'medium', 2.0),
    (14, 'Influencer Outreach', 'Identify and contact relevant influencers', 'high', 3.0),
    (15, 'Social Media Advertising', 'Set up and optimize paid social campaigns', 'high', 2.5),
    
    -- Paid Advertising tasks
    (16, 'Google Ads Setup', 'Create and optimize Google Ads campaigns', 'high', 3.0),
    (17, 'Facebook Ads Campaign', 'Develop targeted Facebook advertising strategy', 'high', 2.5),
    (18, 'LinkedIn Advertising', 'Set up professional B2B advertising campaigns', 'medium', 2.0),
    (19, 'Retargeting Setup', 'Implement retargeting campaigns across platforms', 'medium', 2.0),
    (20, 'Ad Performance Optimization', 'Monitor and optimize ad performance weekly', 'high', 1.5),
    
    -- Analytics & Reporting tasks
    (21, 'Analytics Implementation', 'Set up Google Analytics and conversion tracking', 'high', 1.5),
    (22, 'UTM Parameter Setup', 'Create UTM tracking for all campaigns', 'medium', 1.0),
    (23, 'Dashboard Creation', 'Build comprehensive marketing dashboard', 'high', 2.0),
    (24, 'Monthly Performance Report', 'Create detailed monthly performance analysis', 'high', 2.5),
    (25, 'ROI Analysis', 'Calculate and report on campaign ROI', 'high', 1.5)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id IN (
    SELECT id FROM public.bookings 
    WHERE service_id = '6febf331-d950-4b66-a2d3-6ef772f28834' -- Digital Marketing Service
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 3. Add tasks for Translation Services milestones
INSERT INTO public.tasks (
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index,
  created_at,
  updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.milestone_order = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.milestone_order,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  -- Project Planning tasks
  VALUES 
    (0, 'Document Analysis', 'Analyze source documents and identify translation requirements', 'high', 1.0),
    (1, 'Language Pair Assessment', 'Evaluate source and target language complexity', 'high', 0.5),
    (2, 'Glossary Creation', 'Create specialized terminology glossary', 'medium', 1.5),
    (3, 'Style Guide Development', 'Develop translation style and tone guidelines', 'medium', 1.0),
    (4, 'Timeline Planning', 'Create detailed project timeline and milestones', 'high', 0.5),
    
    -- Translation tasks
    (5, 'Initial Translation', 'Complete first draft of all documents', 'high', 4.0),
    (6, 'Technical Translation', 'Translate technical and specialized content', 'high', 3.0),
    (7, 'Marketing Content Translation', 'Translate marketing materials and copy', 'medium', 2.0),
    (8, 'Legal Document Translation', 'Handle legal and compliance documents', 'high', 2.5),
    (9, 'Website Content Translation', 'Translate website pages and interface', 'medium', 2.0),
    (10, 'Multimedia Translation', 'Translate subtitles and audio content', 'medium', 1.5),
    
    -- Quality Assurance tasks
    (11, 'Proofreading', 'Thorough proofreading of all translated content', 'high', 2.0),
    (12, 'Technical Review', 'Review technical accuracy and terminology', 'high', 1.5),
    (13, 'Cultural Adaptation', 'Ensure cultural appropriateness and localization', 'medium', 1.0),
    (14, 'Consistency Check', 'Verify terminology consistency across documents', 'medium', 1.0),
    (15, 'Formatting Review', 'Ensure proper formatting and layout preservation', 'low', 1.0),
    
    -- Finalization tasks
    (16, 'Client Review', 'Submit for client review and feedback', 'high', 0.5),
    (17, 'Revision Implementation', 'Implement client feedback and corrections', 'high', 1.5),
    (18, 'Final Proofreading', 'Final proofreading before delivery', 'high', 1.0),
    (19, 'Document Formatting', 'Format final documents for delivery', 'medium', 1.0),
    (20, 'Delivery Preparation', 'Prepare final package for client delivery', 'medium', 0.5)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id IN (
    SELECT id FROM public.bookings 
    WHERE service_id = '770e8400-e29b-41d4-a716-446655440007' -- Translation Services
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 4. Add tasks for PRO Services milestones
INSERT INTO public.tasks (
  milestone_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  actual_hours,
  order_index,
  created_at,
  updated_at
)
SELECT 
  m.id as milestone_id,
  task_data.title,
  task_data.description,
  CASE 
    WHEN task_data.milestone_order = 0 THEN 'in_progress'
    ELSE 'pending'
  END as status,
  task_data.priority,
  task_data.estimated_hours,
  0 as actual_hours,
  task_data.milestone_order,
  now() as created_at,
  now() as updated_at
FROM public.milestones m
CROSS JOIN (
  -- Project Initiation tasks
  VALUES 
    (0, 'Requirements Gathering', 'Conduct detailed client requirements analysis', 'high', 2.0),
    (1, 'Project Scope Definition', 'Define clear project scope and deliverables', 'high', 1.5),
    (2, 'Resource Planning', 'Plan team resources and timeline allocation', 'high', 1.0),
    (3, 'Risk Assessment', 'Identify potential risks and mitigation strategies', 'medium', 1.0),
    (4, 'Communication Plan', 'Establish client communication protocols', 'medium', 0.5),
    
    -- Development tasks
    (5, 'System Architecture Design', 'Design technical architecture and infrastructure', 'high', 3.0),
    (6, 'Database Design', 'Create database schema and relationships', 'high', 2.0),
    (7, 'Frontend Development', 'Develop user interface and user experience', 'high', 4.0),
    (8, 'Backend Development', 'Build server-side logic and APIs', 'high', 4.0),
    (9, 'Integration Development', 'Integrate third-party services and APIs', 'medium', 2.5),
    (10, 'Security Implementation', 'Implement security measures and protocols', 'high', 2.0),
    
    -- Testing tasks
    (11, 'Unit Testing', 'Develop and execute unit tests', 'high', 2.0),
    (12, 'Integration Testing', 'Test system integration and data flow', 'high', 1.5),
    (13, 'User Acceptance Testing', 'Conduct UAT with client stakeholders', 'high', 2.0),
    (14, 'Performance Testing', 'Test system performance and scalability', 'medium', 1.5),
    (15, 'Security Testing', 'Conduct security vulnerability assessment', 'high', 1.0),
    
    -- Deployment tasks
    (16, 'Environment Setup', 'Set up production and staging environments', 'high', 1.5),
    (17, 'Deployment Preparation', 'Prepare deployment packages and scripts', 'high', 1.0),
    (18, 'Go-Live Execution', 'Execute production deployment', 'high', 1.0),
    (19, 'Post-Deployment Monitoring', 'Monitor system performance post-deployment', 'high', 1.0),
    (20, 'Documentation Delivery', 'Deliver technical and user documentation', 'medium', 1.5)
) AS task_data(milestone_order, title, description, priority, estimated_hours)
WHERE m.order_index = task_data.milestone_order
  AND m.booking_id IN (
    SELECT id FROM public.bookings 
    WHERE service_id = 'd59a77bb-100a-4bb3-9755-ccb4b07ba06b' -- PRO Services
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.milestone_id = m.id
  );

-- 5. Update booking progress after adding tasks
UPDATE public.bookings 
SET project_progress = (
  SELECT COALESCE(
    ROUND(
      (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::decimal / 
       NULLIF(COUNT(t.id), 0)) * 100
    ), 0
  )
  FROM public.milestones m
  LEFT JOIN public.tasks t ON m.id = t.milestone_id
  WHERE m.booking_id = public.bookings.id
)
WHERE id IN (
  SELECT DISTINCT m.booking_id 
  FROM public.milestones m 
  WHERE m.booking_id IS NOT NULL
);

-- 6. Create sample progress notifications
INSERT INTO public.progress_notifications (
  booking_id,
  user_id,
  type,
  title,
  message,
  data,
  created_at
)
SELECT 
  b.id as booking_id,
  b.client_id as user_id,
  'progress_update' as type,
  'Project Started' as title,
  'Your ' || s.title || ' project has been initiated with detailed milestones and tasks.' as message,
  jsonb_build_object(
    'booking_id', b.id,
    'service_name', s.title,
    'milestones_created', COUNT(m.id),
    'tasks_created', COUNT(t.id)
  ) as data,
  now() as created_at
FROM public.bookings b
JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.milestones m ON b.id = m.booking_id
LEFT JOIN public.tasks t ON m.id = t.milestone_id
WHERE b.status IN ('approved', 'in_progress')
  AND EXISTS (SELECT 1 FROM public.milestones WHERE booking_id = b.id)
GROUP BY b.id, b.client_id, s.title
ON CONFLICT DO NOTHING;

-- 7. Show summary of what was created
SELECT 
  'Sample Tasks Added Successfully!' as status,
  COUNT(DISTINCT t.milestone_id) as milestones_with_tasks,
  COUNT(t.id) as total_tasks_created,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as tasks_pending
FROM public.tasks t
WHERE t.created_at >= now() - INTERVAL '1 minute';
