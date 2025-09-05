const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyEssentialMigration() {
  console.log('🚀 APPLYING ESSENTIAL FLEXIBLE MILESTONE MIGRATION\n')
  console.log('=' * 60)

  try {
    // Step 1: Create Services Table
    console.log('\n📋 STEP 1: Creating Services Table')
    console.log('-'.repeat(40))
    
    const createServicesSQL = `
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    console.log('✅ Services table SQL ready')
    console.log('📋 Manual step: Run this in Supabase SQL Editor:')
    console.log(createServicesSQL)

    // Step 2: Create Service Milestone Templates Table
    console.log('\n🎯 STEP 2: Creating Service Milestone Templates Table')
    console.log('-'.repeat(40))
    
    const createTemplatesSQL = `
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
    `
    
    console.log('✅ Service milestone templates table SQL ready')
    console.log('📋 Manual step: Run this in Supabase SQL Editor:')
    console.log(createTemplatesSQL)

    // Step 3: Update Tables
    console.log('\n📦 STEP 3: Updating Existing Tables')
    console.log('-'.repeat(40))
    
    const updateTablesSQL = `
      -- Update Bookings Table
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);

      -- Update Milestones Table
      ALTER TABLE milestones 
      ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

      -- Update Tasks Table
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;
    `
    
    console.log('✅ Table updates SQL ready')
    console.log('📋 Manual step: Run this in Supabase SQL Editor:')
    console.log(updateTablesSQL)

    // Step 4: Drop and Recreate Functions
    console.log('\n⚙️ STEP 4: Updating Functions')
    console.log('-'.repeat(40))
    
    const updateFunctionsSQL = `
      -- Drop existing functions
      DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
      DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);
      DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
      DROP FUNCTION IF EXISTS update_milestone_progress(UUID);
      DROP FUNCTION IF EXISTS trigger_generate_milestones();
      DROP FUNCTION IF EXISTS trigger_update_milestone_progress();

      -- Create generate_milestones_from_templates function
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

      -- Create calculate_booking_progress function
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

      -- Create update_milestone_progress function
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
    `
    
    console.log('✅ Functions update SQL ready')
    console.log('📋 Manual step: Run this in Supabase SQL Editor:')
    console.log(updateFunctionsSQL)

    // Step 5: Insert Sample Data
    console.log('\n📊 STEP 5: Inserting Sample Data')
    console.log('-'.repeat(40))
    
    const insertSampleDataSQL = `
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
    `
    
    console.log('✅ Sample data SQL ready')
    console.log('📋 Manual step: Run this in Supabase SQL Editor:')
    console.log(insertSampleDataSQL)

    console.log('\n' + '='.repeat(60))
    console.log('🎯 ESSENTIAL MIGRATION STEPS COMPLETE')
    console.log('='.repeat(60))
    console.log('\n📋 MANUAL STEPS REQUIRED:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste each SQL block above')
    console.log('4. Execute them one by one in order')
    console.log('5. Run the test script to verify')
    
    console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard')
    console.log('\n🧪 After migration, test with: node test-flexible-milestone-system.js')
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message)
  }
}

applyEssentialMigration()
