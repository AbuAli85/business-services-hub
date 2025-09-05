# Flexible Milestone System Migration Guide

## 🚀 **Migration Overview**

This guide will help you set up the new flexible milestone system that supports different milestone templates per service type.

---

## 📋 **Step-by-Step Migration**

### **Step 1: Create Services Table**

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read services
CREATE POLICY "Allow read access to services" ON services
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update services (for admin use)
CREATE POLICY "Allow insert access to services" ON services
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to services" ON services
    FOR UPDATE USING (true);
```

### **Step 2: Create Service Milestone Templates Table**

```sql
-- Create Service Milestone Templates Table
CREATE TABLE IF NOT EXISTS service_milestone_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
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

### **Step 3: Update Existing Tables**

```sql
-- Update Bookings Table - Add service_id column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);

-- Update Milestones Table - Add new columns
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Update Tasks Table - Add editable column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;
```

### **Step 4: Create Functions**

```sql
-- Create function to generate milestones from templates
CREATE OR REPLACE FUNCTION generate_milestones_from_templates(booking_uuid UUID)
RETURNS VOID AS $$
DECLARE
    booking_service_id UUID;
    template_record RECORD;
    milestone_count INTEGER := 0;
BEGIN
    -- Get the service_id for this booking
    SELECT service_id INTO booking_service_id
    FROM bookings
    WHERE id = booking_uuid;
    
    -- If no service_id, exit
    IF booking_service_id IS NULL THEN
        RAISE NOTICE 'No service_id found for booking %', booking_uuid;
        RETURN;
    END IF;
    
    -- Insert milestones from templates
    FOR template_record IN
        SELECT title, description, default_weight, default_order, is_required
        FROM service_milestone_templates
        WHERE service_id = booking_service_id
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

-- Update calculate_booking_progress function to use progress_percentage
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
        WHERE booking_id = calculate_booking_progress.booking_id
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

-- Update update_milestone_progress function to use progress_percentage
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
    new_progress INTEGER;
    booking_uuid UUID;
BEGIN
    -- Get the booking_id for this milestone
    SELECT booking_id INTO booking_uuid
    FROM milestones
    WHERE id = milestone_uuid;
    
    -- Count total and completed tasks for this milestone
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_steps, completed_steps
    FROM tasks
    WHERE milestone_id = milestone_uuid;
    
    -- Calculate progress percentage
    IF total_steps > 0 THEN
        new_progress := ROUND((completed_steps * 100.0) / total_steps);
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update the milestone progress
    UPDATE milestones
    SET progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = milestone_uuid;
    
    -- Recalculate and sync overall booking progress
    PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql;
```

### **Step 5: Create Triggers**

```sql
-- Create trigger for auto-generating milestones on booking creation
CREATE OR REPLACE FUNCTION trigger_generate_milestones()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate milestones if service_id is provided
    IF NEW.service_id IS NOT NULL THEN
        PERFORM generate_milestones_from_templates(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_milestones ON bookings;

-- Create the trigger
CREATE TRIGGER trigger_auto_generate_milestones
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_milestones();

-- Create trigger for updating milestone progress when tasks change
CREATE OR REPLACE FUNCTION trigger_update_milestone_progress()
RETURNS TRIGGER AS $$
DECLARE
    milestone_id UUID;
BEGIN
    -- Get milestone_id from the task
    IF TG_OP = 'DELETE' THEN
        milestone_id := OLD.milestone_id;
    ELSE
        milestone_id := NEW.milestone_id;
    END IF;
    
    -- Update milestone progress
    PERFORM update_milestone_progress(milestone_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_insert ON tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_update ON tasks;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress_delete ON tasks;

-- Create triggers for task changes
CREATE TRIGGER trigger_update_milestone_progress_insert
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();

CREATE TRIGGER trigger_update_milestone_progress_update
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();

CREATE TRIGGER trigger_update_milestone_progress_delete
    AFTER DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_milestone_progress();
```

### **Step 6: Insert Sample Data**

```sql
-- Insert Sample Services
INSERT INTO services (name, description) VALUES
('Social Media Management', 'Complete social media management including content creation, posting, and engagement'),
('Web Development', 'Custom website development and maintenance'),
('SEO Services', 'Search engine optimization and digital marketing'),
('Content Marketing', 'Content creation and marketing strategy'),
('Digital Marketing Audit', 'Comprehensive digital marketing analysis and recommendations')
ON CONFLICT (name) DO NOTHING;

-- Insert Sample Milestone Templates for Social Media Management
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Week 1: Strategy & Planning', 'Develop social media strategy and content calendar', 1.0, 1, true),
    ('Week 2: Content Creation', 'Create visual content and copy for all platforms', 1.0, 2, true),
    ('Week 3: Content Publishing', 'Schedule and publish content across all platforms', 1.0, 3, true),
    ('Week 4: Engagement & Monitoring', 'Monitor engagement and respond to comments', 1.0, 4, true),
    ('Monthly: Analytics & Reporting', 'Generate monthly performance reports', 1.0, 5, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'Social Media Management'
ON CONFLICT (service_id, title) DO NOTHING;

-- Insert Sample Milestone Templates for Web Development
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Phase 1: Requirements & Planning', 'Gather requirements and create project plan', 1.0, 1, true),
    ('Phase 2: Design & Wireframing', 'Create wireframes and visual designs', 1.0, 2, true),
    ('Phase 3: Development', 'Build the website with all features', 1.0, 3, true),
    ('Phase 4: Testing & Quality Assurance', 'Test all functionality and fix bugs', 1.0, 4, true),
    ('Phase 5: Launch & Deployment', 'Deploy website and go live', 1.0, 5, true),
    ('Phase 6: Maintenance & Support', 'Ongoing maintenance and support', 0.5, 6, false)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'Web Development'
ON CONFLICT (service_id, title) DO NOTHING;

-- Insert Sample Milestone Templates for SEO Services
INSERT INTO service_milestone_templates (service_id, title, description, default_weight, default_order, is_required)
SELECT 
    s.id,
    template_data.title,
    template_data.description,
    template_data.default_weight,
    template_data.default_order,
    template_data.is_required
FROM services s
CROSS JOIN (VALUES
    ('Week 1: SEO Audit', 'Conduct comprehensive SEO audit and analysis', 1.0, 1, true),
    ('Week 2: Keyword Research', 'Research and identify target keywords', 1.0, 2, true),
    ('Week 3: On-Page Optimization', 'Optimize on-page elements and content', 1.0, 3, true),
    ('Week 4: Technical SEO', 'Fix technical SEO issues and improve site speed', 1.0, 4, true),
    ('Month 2: Link Building', 'Build high-quality backlinks', 1.0, 5, true),
    ('Month 3: Monitoring & Reporting', 'Monitor rankings and generate reports', 1.0, 6, true)
) AS template_data(title, description, default_weight, default_order, is_required)
WHERE s.name = 'SEO Services'
ON CONFLICT (service_id, title) DO NOTHING;
```

### **Step 7: Create Indexes for Performance**

```sql
-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_service_id ON milestones(booking_id) WHERE booking_id IN (SELECT id FROM bookings WHERE service_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_service_milestone_templates_service_id ON service_milestone_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
```

---

## 🧪 **Testing the Migration**

After running all the SQL statements, test the migration with:

```bash
node test-flexible-milestone-system.js
```

---

## 🎯 **What This Migration Accomplishes**

1. **Flexible Service Types**: Different milestone templates for each service type
2. **Automatic Milestone Generation**: Milestones are created automatically when bookings are made
3. **Weighted Progress Calculation**: Milestones can have different weights in progress calculation
4. **Editable Milestones & Tasks**: Providers can edit milestones and tasks as needed
5. **Real-time Progress Updates**: Progress updates automatically when tasks are completed
6. **Service-based Organization**: Milestones are organized by service type

---

## 🔧 **Troubleshooting**

If you encounter any issues:

1. **Check Table Existence**: Verify all tables were created successfully
2. **Check Functions**: Ensure all functions are created without errors
3. **Check Triggers**: Verify triggers are attached to the correct tables
4. **Check Sample Data**: Confirm sample services and templates were inserted
5. **Test Functions**: Run the test script to verify everything works

---

## 📞 **Support**

If you need help with the migration, check:
- Supabase logs for any SQL errors
- Database schema to ensure all tables exist
- Function definitions in the Supabase dashboard
