-- Migration: Create Service Master Tables
-- Date: January 2025
-- Description: Create master tables for professional service creation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT, -- Icon name for UI
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create service_titles table
CREATE TABLE IF NOT EXISTS public.service_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT false, -- true for "Other (Custom)" option
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create deliverables_master table
CREATE TABLE IF NOT EXISTS public.deliverables_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    deliverable TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create requirements_master table
CREATE TABLE IF NOT EXISTS public.requirements_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create milestones_master table
CREATE TABLE IF NOT EXISTS public.milestones_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    estimated_duration INTEGER DEFAULT 1, -- in days
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for all tables
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones_master ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read master data
CREATE POLICY "Allow read access to service_categories" ON public.service_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to service_titles" ON public.service_titles
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to deliverables_master" ON public.deliverables_master
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to requirements_master" ON public.requirements_master
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to milestones_master" ON public.milestones_master
    FOR SELECT USING (true);

-- Insert sample data for PRO Services category
INSERT INTO public.service_categories (id, name, description, icon, sort_order) VALUES
    (uuid_generate_v4(), 'PRO Services', 'Government and regulatory services', 'building', 1),
    (uuid_generate_v4(), 'Legal Services', 'Legal consultation and documentation', 'scale', 2),
    (uuid_generate_v4(), 'Digital Marketing', 'Online marketing and advertising', 'megaphone', 3),
    (uuid_generate_v4(), 'Accounting', 'Financial and accounting services', 'calculator', 4),
    (uuid_generate_v4(), 'HR Services', 'Human resources and recruitment', 'users', 5),
    (uuid_generate_v4(), 'IT Services', 'Technology and software solutions', 'monitor', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample service titles for PRO Services
INSERT INTO public.service_titles (category_id, title, description, sort_order)
SELECT 
    c.id,
    t.title,
    t.description,
    t.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Company Formation', 'Complete company registration process', 1),
    ('Visa & ID Processing', 'Visa applications and ID card processing', 2),
    ('Business License', 'Obtain necessary business licenses', 3),
    ('Trade License', 'Commercial trade license applications', 4),
    ('Labor Card', 'Employee labor card processing', 5),
    ('Other (Custom)', 'Custom service title', 999)
) AS t(title, description, sort_order)
WHERE c.name = 'PRO Services'
ON CONFLICT DO NOTHING;

-- Insert sample deliverables for PRO Services
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT 
    c.id,
    d.deliverable,
    d.description,
    d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('CR Registration', 'Commercial Registration certificate', 1),
    ('Business License', 'Official business operating license', 2),
    ('Visa & ID Card', 'Employee visa and ID card', 3),
    ('Labor Card', 'Employee labor card', 4),
    ('Trade License', 'Commercial trade license', 5),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'PRO Services'
ON CONFLICT DO NOTHING;

-- Insert sample requirements for PRO Services
INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT 
    c.id,
    r.requirement,
    r.description,
    r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Passport Copies', 'Valid passport copies of all stakeholders', 1),
    ('Business Plan', 'Detailed business plan and objectives', 2),
    ('Financial Statements', 'Bank statements and financial documents', 3),
    ('Office Lease Agreement', 'Commercial office lease documentation', 4),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'PRO Services'
ON CONFLICT DO NOTHING;

-- Insert sample milestones for PRO Services
INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT 
    c.id,
    m.title,
    m.description,
    m.estimated_duration,
    m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Project Kickoff', 'Initial consultation and document collection', 2, 1),
    ('CR Registration', 'Commercial registration application and processing', 5, 2),
    ('Business Licensing', 'Obtain necessary business licenses', 4, 3),
    ('Visa & ID Processing', 'Employee visa and ID card applications', 7, 4),
    ('Final Handover', 'Document delivery and project completion', 2, 5)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'PRO Services'
ON CONFLICT DO NOTHING;

-- Insert sample data for Digital Marketing category
INSERT INTO public.service_titles (category_id, title, description, sort_order)
SELECT 
    c.id,
    t.title,
    t.description,
    t.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Social Media Management', 'Complete social media strategy and management', 1),
    ('SEO Optimization', 'Search engine optimization services', 2),
    ('Content Marketing', 'Content creation and marketing strategy', 3),
    ('PPC Advertising', 'Pay-per-click advertising campaigns', 4),
    ('Other (Custom)', 'Custom service title', 999)
) AS t(title, description, sort_order)
WHERE c.name = 'Digital Marketing'
ON CONFLICT DO NOTHING;

-- Insert sample deliverables for Digital Marketing
INSERT INTO public.deliverables_master (category_id, deliverable, description, sort_order)
SELECT 
    c.id,
    d.deliverable,
    d.description,
    d.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Marketing Strategy', 'Comprehensive digital marketing strategy', 1),
    ('Content Calendar', 'Monthly content planning calendar', 2),
    ('Social Media Posts', 'Curated social media content', 3),
    ('SEO Report', 'Search engine optimization analysis', 4),
    ('Other (Custom)', 'Custom deliverable', 999)
) AS d(deliverable, description, sort_order)
WHERE c.name = 'Digital Marketing'
ON CONFLICT DO NOTHING;

-- Insert sample requirements for Digital Marketing
INSERT INTO public.requirements_master (category_id, requirement, description, sort_order)
SELECT 
    c.id,
    r.requirement,
    r.description,
    r.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Brand Guidelines', 'Company branding and style guidelines', 1),
    ('Social Media Access', 'Login credentials for social media accounts', 2),
    ('Product Photos', 'High-quality product images', 3),
    ('Target Audience Info', 'Detailed target audience demographics', 4),
    ('Other (Custom)', 'Custom requirement', 999)
) AS r(requirement, description, sort_order)
WHERE c.name = 'Digital Marketing'
ON CONFLICT DO NOTHING;

-- Insert sample milestones for Digital Marketing
INSERT INTO public.milestones_master (category_id, title, description, estimated_duration, sort_order)
SELECT 
    c.id,
    m.title,
    m.description,
    m.estimated_duration,
    m.sort_order
FROM public.service_categories c
CROSS JOIN (VALUES
    ('Strategy Development', 'Create comprehensive digital marketing strategy', 3, 1),
    ('Content Creation', 'Develop marketing content and materials', 5, 2),
    ('Campaign Setup', 'Set up advertising campaigns and tracking', 2, 3),
    ('Campaign Launch', 'Launch and monitor marketing campaigns', 7, 4),
    ('Performance Review', 'Analyze results and provide recommendations', 3, 5)
) AS m(title, description, estimated_duration, sort_order)
WHERE c.name = 'Digital Marketing'
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_titles_category_id ON public.service_titles(category_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_master_category_id ON public.deliverables_master(category_id);
CREATE INDEX IF NOT EXISTS idx_requirements_master_category_id ON public.requirements_master(category_id);
CREATE INDEX IF NOT EXISTS idx_milestones_master_category_id ON public.milestones_master(category_id);

-- Add comments for documentation
COMMENT ON TABLE public.service_categories IS 'Master list of service categories';
COMMENT ON TABLE public.service_titles IS 'Master list of service titles by category';
COMMENT ON TABLE public.deliverables_master IS 'Master list of deliverables by category';
COMMENT ON TABLE public.requirements_master IS 'Master list of requirements by category';
COMMENT ON TABLE public.milestones_master IS 'Master list of milestones by category';
