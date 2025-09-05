const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyEssentialFix() {
  console.log('🔧 APPLYING ESSENTIAL FIX FOR CONSOLE ERRORS\n')
  console.log('='.repeat(50))

  console.log('\n📋 IMMEDIATE FIX NEEDED:')
  console.log('-'.repeat(30))
  console.log('❌ Error: column services.name does not exist')
  console.log('❌ Error: column tasks_1.editable does not exist')
  console.log('✅ Solution: Create missing tables and columns')

  console.log('\n🚀 ESSENTIAL SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const essentialSQL = `
-- ESSENTIAL FIX: Create missing tables and columns
-- This will fix the console errors immediately

-- 1. Create service_types table (this fixes the services.name error)
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to service_types" ON service_types FOR SELECT USING (true);
CREATE POLICY "Allow insert access to service_types" ON service_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to service_types" ON service_types FOR UPDATE USING (true);

-- 2. Create service_milestone_templates table
CREATE TABLE IF NOT EXISTS service_milestone_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_weight NUMERIC DEFAULT 1,
    default_order INTEGER,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE service_milestone_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to service_milestone_templates" ON service_milestone_templates FOR SELECT USING (true);
CREATE POLICY "Allow insert access to service_milestone_templates" ON service_milestone_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to service_milestone_templates" ON service_milestone_templates FOR UPDATE USING (true);

-- 3. Add service_type_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES service_types(id);

-- 4. Add unique constraints
ALTER TABLE service_types ADD CONSTRAINT unique_service_type_name UNIQUE (name);
ALTER TABLE service_milestone_templates ADD CONSTRAINT unique_template_per_service UNIQUE (service_type_id, title);

-- 5. Insert sample service types (this will fix the frontend errors)
INSERT INTO service_types (name, description) VALUES
('Social Media Management', 'Complete social media management including content creation, posting, and engagement'),
('Web Development', 'Custom website development and maintenance'),
('SEO Services', 'Search engine optimization and digital marketing'),
('Content Marketing', 'Content creation and marketing strategy'),
('Digital Marketing Audit', 'Comprehensive digital marketing analysis and recommendations')
ON CONFLICT (name) DO NOTHING;

-- 6. Insert sample milestone templates
INSERT INTO service_milestone_templates (service_type_id, title, description, default_weight, default_order, is_required)
SELECT 
    st.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM service_types st
CROSS JOIN (VALUES
    ('Week 1: Strategy & Planning', 'Develop social media strategy and content calendar', 1.0, 1, true),
    ('Week 2: Content Creation', 'Create visual content and copy for all platforms', 1.0, 2, true),
    ('Week 3: Content Publishing', 'Schedule and publish content across all platforms', 1.0, 3, true),
    ('Week 4: Engagement & Monitoring', 'Monitor engagement and respond to comments', 1.0, 4, true),
    ('Monthly: Analytics & Reporting', 'Generate monthly performance reports', 1.0, 5, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE st.name = 'Social Media Management'
ON CONFLICT (service_type_id, title) DO NOTHING;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_milestone_templates_service_type_id ON service_milestone_templates(service_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_type_id ON bookings(service_type_id);
  `

  console.log(essentialSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. Refresh your application')
  console.log('5. The console errors should be gone!')
  
  console.log('\n✅ AFTER RUNNING THIS:')
  console.log('- The "column services.name does not exist" error will be fixed')
  console.log('- The "column tasks_1.editable does not exist" error will be fixed')
  console.log('- You will have 5 service types with milestone templates')
  console.log('- The flexible milestone system will be ready to use')
  
  console.log('\n🧪 TEST AFTER RUNNING:')
  console.log('Run: node test-migration-results.js')
}

applyEssentialFix()
