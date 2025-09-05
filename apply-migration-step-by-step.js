const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigrationStepByStep() {
  console.log('🚀 APPLYING FLEXIBLE MILESTONE SYSTEM MIGRATION (STEP BY STEP)\n')
  console.log('=' * 60)

  try {
    // Step 1: Create Services Table
    console.log('\n📋 STEP 1: Creating Services Table')
    console.log('-'.repeat(40))
    
    const createServicesTable = `
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createServicesTable })
      if (error) {
        console.log('⚠️ Services table might already exist or exec_sql not available')
        console.log('   Manual step: Run this SQL in Supabase dashboard:')
        console.log('   ' + createServicesTable.trim())
      } else {
        console.log('✅ Services table created successfully')
      }
    } catch (e) {
      console.log('⚠️ exec_sql not available, manual step required')
    }

    // Step 2: Create Service Milestone Templates Table
    console.log('\n🎯 STEP 2: Creating Service Milestone Templates Table')
    console.log('-'.repeat(40))
    
    const createTemplatesTable = `
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
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + createTemplatesTable.trim())

    // Step 3: Update Bookings Table
    console.log('\n📦 STEP 3: Updating Bookings Table')
    console.log('-'.repeat(40))
    
    const updateBookingsTable = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);
    `
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + updateBookingsTable.trim())

    // Step 4: Update Milestones Table
    console.log('\n🎯 STEP 4: Updating Milestones Table')
    console.log('-'.repeat(40))
    
    const updateMilestonesTable = `
      ALTER TABLE milestones 
      ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    `
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + updateMilestonesTable.trim())

    // Step 5: Update Tasks Table
    console.log('\n📝 STEP 5: Updating Tasks Table')
    console.log('-'.repeat(40))
    
    const updateTasksTable = `
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;
    `
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + updateTasksTable.trim())

    // Step 6: Insert Sample Data
    console.log('\n📊 STEP 6: Inserting Sample Data')
    console.log('-'.repeat(40))
    
    const insertSampleData = `
      -- Insert Sample Services
      INSERT INTO services (name, description) VALUES
      ('Social Media Management', 'Complete social media management including content creation, posting, and engagement'),
      ('Web Development', 'Custom website development and maintenance'),
      ('SEO Services', 'Search engine optimization and digital marketing'),
      ('Content Marketing', 'Content creation and marketing strategy'),
      ('Digital Marketing Audit', 'Comprehensive digital marketing analysis and recommendations')
      ON CONFLICT (name) DO NOTHING;
    `
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + insertSampleData.trim())

    // Step 7: Create Functions
    console.log('\n⚙️ STEP 7: Creating Functions')
    console.log('-'.repeat(40))
    
    const createFunctions = `
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
    `
    
    console.log('   Manual step: Run this SQL in Supabase dashboard:')
    console.log('   ' + createFunctions.trim())

    console.log('\n' + '='.repeat(60))
    console.log('🎯 MIGRATION STEPS COMPLETE')
    console.log('='.repeat(60))
    console.log('\n📋 MANUAL STEPS REQUIRED:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste each SQL statement above')
    console.log('4. Execute them one by one')
    console.log('5. Run the test script to verify')
    
    console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard')
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message)
  }
}

applyMigrationStepByStep()
