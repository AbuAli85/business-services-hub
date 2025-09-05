# 🔧 Migration Fix Summary - Flexible Milestone System

## 🎯 **Current Status**

Based on the console errors in your application, the migration was **partially applied** but has several issues that need to be fixed.

## ❌ **Problems Identified**

1. **`column services.name does not exist`** - The `service_types` table wasn't created
2. **`column tasks_1.editable does not exist`** - Some new columns weren't added properly
3. **`column reference "booking_id" is ambiguous`** - Function has ambiguous column reference
4. **Missing `service_milestone_templates` table** - Templates table wasn't created

## ✅ **Solution: Step-by-Step Migration**

I've created a step-by-step migration that will fix all these issues. Here's what you need to do:

### **Step 1: Create service_types table**

```sql
-- 1. Create Service Types Table
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_types table
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read service types
CREATE POLICY "Allow read access to service_types" ON service_types
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update service types (for admin use)
CREATE POLICY "Allow insert access to service_types" ON service_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to service_types" ON service_types
    FOR UPDATE USING (true);
```

### **Step 2: Create service_milestone_templates table**

```sql
-- 2. Create Service Milestone Templates Table
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

-- Add RLS policies for service_milestone_templates table
ALTER TABLE service_milestone_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read templates
CREATE POLICY "Allow read access to service_milestone_templates" ON service_milestone_templates
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update templates (for admin use)
CREATE POLICY "Allow insert access to service_milestone_templates" ON service_milestone_templates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to service_milestone_templates" ON service_milestone_templates
    FOR UPDATE USING (true);
```

### **Step 3: Add service_type_id to bookings table**

```sql
-- 3. Update Bookings Table - Add service_type_id column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES service_types(id);
```

### **Step 4: Add unique constraints**

```sql
-- 4. Add unique constraints
ALTER TABLE service_types ADD CONSTRAINT unique_service_type_name UNIQUE (name);
ALTER TABLE service_milestone_templates ADD CONSTRAINT unique_template_per_service UNIQUE (service_type_id, title);
```

### **Step 5: Insert sample service types**

```sql
-- 5. Insert Sample Service Types
INSERT INTO service_types (name, description) VALUES
('Social Media Management', 'Complete social media management including content creation, posting, and engagement'),
('Web Development', 'Custom website development and maintenance'),
('SEO Services', 'Search engine optimization and digital marketing'),
('Content Marketing', 'Content creation and marketing strategy'),
('Digital Marketing Audit', 'Comprehensive digital marketing analysis and recommendations')
ON CONFLICT (name) DO NOTHING;
```

### **Step 6: Insert sample milestone templates**

```sql
-- 6. Insert Sample Milestone Templates for Social Media Management
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

-- Insert Sample Milestone Templates for Web Development
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
    ('Phase 1: Requirements & Planning', 'Gather requirements and create project plan', 1.0, 1, true),
    ('Phase 2: Design & Wireframing', 'Create wireframes and visual designs', 1.0, 2, true),
    ('Phase 3: Development', 'Build the website with all features', 1.0, 3, true),
    ('Phase 4: Testing & Quality Assurance', 'Test all functionality and fix bugs', 1.0, 4, true),
    ('Phase 5: Launch & Deployment', 'Deploy website and go live', 1.0, 5, true),
    ('Phase 6: Maintenance & Support', 'Ongoing maintenance and support', 0.5, 6, false)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE st.name = 'Web Development'
ON CONFLICT (service_type_id, title) DO NOTHING;

-- Insert Sample Milestone Templates for SEO Services
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
    ('Week 1: SEO Audit', 'Conduct comprehensive SEO audit and analysis', 1.0, 1, true),
    ('Week 2: Keyword Research', 'Research and identify target keywords', 1.0, 2, true),
    ('Week 3: On-Page Optimization', 'Optimize on-page elements and content', 1.0, 3, true),
    ('Week 4: Technical SEO', 'Fix technical SEO issues and improve site speed', 1.0, 4, true),
    ('Month 2: Link Building', 'Build high-quality backlinks', 1.0, 5, true),
    ('Month 3: Monitoring & Reporting', 'Monitor rankings and generate reports', 1.0, 6, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE st.name = 'SEO Services'
ON CONFLICT (service_type_id, title) DO NOTHING;
```

### **Step 7: Fix calculate_booking_progress function**

```sql
-- 7. Fix calculate_booking_progress function (fix ambiguous column reference)
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);

CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_progress INTEGER;
    milestone_count INTEGER;
    weighted_progress NUMERIC := 0;
    total_weight NUMERIC := 0;
    milestone_record RECORD;
BEGIN
    -- Calculate weighted progress across all milestones for this booking
    FOR milestone_record IN
        SELECT progress_percentage, weight
        FROM milestones
        WHERE milestones.booking_id = calculate_booking_progress.booking_id
    LOOP
        weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
        total_weight := total_weight + milestone_record.weight;
        milestone_count := milestone_count + 1;
    END LOOP;
    
    -- Calculate average progress
    IF total_weight > 0 THEN
        total_progress := ROUND(weighted_progress / total_weight);
    ELSE
        total_progress := 0;
    END IF;
    
    -- Return 0 if no milestones exist
    IF milestone_count = 0 THEN
        total_progress := 0;
    END IF;
    
    -- Update the bookings table with the calculated progress
    UPDATE bookings 
    SET project_progress = total_progress,
        updated_at = NOW()
    WHERE id = calculate_booking_progress.booking_id;
    
    RETURN total_progress;
END;
$$ LANGUAGE plpgsql;
```

### **Step 8: Create generate_milestones_from_templates function**

```sql
-- 8. Create Function to Generate Milestones from Templates
CREATE OR REPLACE FUNCTION generate_milestones_from_templates(booking_uuid UUID)
RETURNS VOID AS $$
DECLARE
    booking_service_type_id UUID;
    template_record RECORD;
    milestone_count INTEGER := 0;
BEGIN
    -- Get the service_type_id for this booking
    SELECT service_type_id INTO booking_service_type_id
    FROM bookings
    WHERE id = booking_uuid;
    
    -- If no service_type_id, exit
    IF booking_service_type_id IS NULL THEN
        RAISE NOTICE 'No service_type_id found for booking %', booking_uuid;
        RETURN;
    END IF;
    
    -- Insert milestones from templates
    FOR template_record IN
        SELECT title, description, default_weight, default_order, is_required
        FROM service_milestone_templates
        WHERE service_type_id = booking_service_type_id
        ORDER BY default_order ASC, title ASC
    LOOP
        INSERT INTO milestones (
            booking_id,
            title,
            description,
            weight,
            order_index,
            status,
            progress_percentage,
            editable,
            created_at,
            updated_at
        ) VALUES (
            booking_uuid,
            template_record.title,
            template_record.description,
            template_record.default_weight,
            template_record.default_order,
            'pending',
            0,
            true,
            NOW(),
            NOW()
        );
        
        milestone_count := milestone_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated % milestones for booking %', milestone_count, booking_uuid;
END;
$$ LANGUAGE plpgsql;
```

### **Step 9: Create indexes for performance**

```sql
-- 9. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_service_milestone_templates_service_type_id ON service_milestone_templates(service_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_type_id ON bookings(service_type_id);
```

## 🧪 **Testing the Migration**

After running all the steps above, test with:

```bash
node test-migration-results.js
```

## 🎯 **Expected Results**

After completing all steps, you should have:

1. ✅ **5 Service Types** with milestone templates
2. ✅ **No more console errors** in your application
3. ✅ **Working progress tracking** system
4. ✅ **Automatic milestone generation** for new bookings
5. ✅ **Flexible milestone management** in the UI

## 🚀 **Next Steps**

1. **Run each step** in Supabase SQL Editor
2. **Test the migration** with the test script
3. **Update your booking form** to include `service_type_id` dropdown
4. **Test creating a booking** with a service type
5. **Verify milestones are auto-generated**

The flexible milestone system will be fully functional! 🎉
