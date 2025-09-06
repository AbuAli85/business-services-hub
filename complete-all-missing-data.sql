-- Complete all missing service data for remaining categories
-- This script adds deliverables, requirements, and milestones for all categories with 0 counts

-- Add data for Translation Services
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Translated Documents', 'Accurately translated documents in target language', 1),
    ('Certified Translation', 'Official certified translations with authentication', 2),
    ('Translation Report', 'Quality assurance and translation notes', 3),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Translation Services' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Source Documents', 'Original documents to be translated', 1),
    ('Target Language', 'Specific language for translation', 2),
    ('Quality Standards', 'Translation quality and accuracy requirements', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Translation Services' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Document Analysis', 'Review and analysis of source documents', 1, 1),
    ('Translation Process', 'Professional translation work', 3, 2),
    ('Quality Review', 'Translation review and quality assurance', 1, 3),
    ('Final Delivery', 'Delivery of translated documents', 1, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Translation Services' ON CONFLICT DO NOTHING;

-- Add data for Real Estate Services
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Property Valuation Report', 'Comprehensive property valuation analysis', 1),
    ('Market Analysis', 'Real estate market research and insights', 2),
    ('Property Management Plan', 'Complete property management strategy', 3),
    ('Legal Documentation', 'Property-related legal documents', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Real Estate Services' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Property Details', 'Property information and specifications', 1),
    ('Legal Documents', 'Property deeds and legal paperwork', 2),
    ('Market Preferences', 'Target market and pricing expectations', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Real Estate Services' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Property Assessment', 'Initial property evaluation and analysis', 2, 1),
    ('Market Research', 'Comprehensive market analysis', 3, 2),
    ('Strategy Development', 'Real estate strategy and recommendations', 2, 3),
    ('Implementation', 'Strategy implementation and execution', 4, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Real Estate Services' ON CONFLICT DO NOTHING;

-- Add data for Healthcare Services
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Medical Consultation Report', 'Comprehensive medical consultation', 1),
    ('Health Assessment', 'Detailed health evaluation and recommendations', 2),
    ('Treatment Plan', 'Personalized treatment and care plan', 3),
    ('Medical Documentation', 'Medical records and documentation', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Healthcare Services' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Medical History', 'Patient medical history and records', 1),
    ('Health Concerns', 'Specific health issues and concerns', 2),
    ('Insurance Information', 'Health insurance details and coverage', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Healthcare Services' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Initial Consultation', 'Medical consultation and assessment', 1, 1),
    ('Health Evaluation', 'Comprehensive health evaluation', 2, 2),
    ('Treatment Planning', 'Development of treatment plan', 2, 3),
    ('Follow-up Care', 'Ongoing care and monitoring', 3, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Healthcare Services' ON CONFLICT DO NOTHING;

-- Add data for Education & Training
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Training Materials', 'Comprehensive training content and materials', 1),
    ('Online Course', 'Complete online learning course', 2),
    ('Assessment Tools', 'Evaluation and testing materials', 3),
    ('Certification', 'Course completion certificates', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Education & Training' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Learning Objectives', 'Specific learning goals and outcomes', 1),
    ('Target Audience', 'Learner demographics and skill levels', 2),
    ('Content Preferences', 'Preferred learning methods and formats', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Education & Training' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Curriculum Design', 'Course curriculum and content planning', 4, 1),
    ('Content Development', 'Creating training materials and content', 6, 2),
    ('Course Testing', 'Testing and quality assurance', 2, 3),
    ('Course Launch', 'Course delivery and launch', 2, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Education & Training' ON CONFLICT DO NOTHING;

-- Add data for Manufacturing
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Production Plan', 'Comprehensive manufacturing production plan', 1),
    ('Quality Control System', 'Quality assurance and control procedures', 2),
    ('Process Documentation', 'Manufacturing process documentation', 3),
    ('Equipment Specifications', 'Manufacturing equipment recommendations', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Manufacturing' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Product Specifications', 'Detailed product requirements and specs', 1),
    ('Production Volume', 'Expected production quantities and timelines', 2),
    ('Quality Standards', 'Quality requirements and standards', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Manufacturing' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Production Analysis', 'Current production process evaluation', 3, 1),
    ('Process Design', 'Manufacturing process design and optimization', 5, 2),
    ('Implementation', 'Production system implementation', 7, 3),
    ('Quality Assurance', 'Quality control system setup', 3, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Manufacturing' ON CONFLICT DO NOTHING;

-- Add data for Financial Services
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Financial Plan', 'Comprehensive financial planning document', 1),
    ('Investment Analysis', 'Detailed investment analysis and recommendations', 2),
    ('Tax Strategy', 'Tax planning and optimization strategy', 3),
    ('Financial Reports', 'Regular financial reporting and analysis', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Financial Services' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Financial Statements', 'Current financial statements and records', 1),
    ('Investment Goals', 'Financial objectives and investment goals', 2),
    ('Risk Tolerance', 'Investment risk preferences and constraints', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Financial Services' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Financial Assessment', 'Current financial situation analysis', 2, 1),
    ('Strategy Development', 'Financial strategy and plan development', 3, 2),
    ('Implementation', 'Financial plan implementation', 4, 3),
    ('Monitoring', 'Ongoing financial monitoring and review', 2, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Financial Services' ON CONFLICT DO NOTHING;

-- Add data for Logistics & Shipping
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT c.id, d.deliverable, d.description, d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Logistics Plan', 'Comprehensive logistics and shipping strategy', 1),
    ('Supply Chain Analysis', 'Supply chain optimization analysis', 2),
    ('Shipping Solutions', 'Custom shipping and delivery solutions', 3),
    ('Tracking System', 'Package tracking and monitoring system', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Logistics & Shipping' ON CONFLICT DO NOTHING;

INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT c.id, r.requirement, r.description, r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Shipping Requirements', 'Specific shipping needs and destinations', 1),
    ('Product Information', 'Product details and shipping specifications', 2),
    ('Timeline Requirements', 'Delivery deadlines and time constraints', 3),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Logistics & Shipping' ON CONFLICT DO NOTHING;

INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT c.id, m.title, m.description, m.estimated_duration, m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Logistics Assessment', 'Current logistics process evaluation', 2, 1),
    ('Solution Design', 'Custom logistics solution design', 3, 2),
    ('Implementation', 'Logistics system implementation', 4, 3),
    ('Testing & Optimization', 'System testing and performance optimization', 2, 4)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Logistics & Shipping' ON CONFLICT DO NOTHING;

-- Final verification
SELECT 
    c.name as category_name,
    COUNT(DISTINCT d.id) as deliverables_count,
    COUNT(DISTINCT r.id) as requirements_count,
    COUNT(DISTINCT m.id) as milestones_count
FROM public.service_categories c
LEFT JOIN public.deliverables_master d ON c.id = d.category_id
LEFT JOIN public.requirements_master r ON c.id = r.category_id
LEFT JOIN public.milestones_master m ON c.id = m.category_id
WHERE c.is_active = true
GROUP BY c.name, c.sort_order
ORDER BY c.sort_order;
