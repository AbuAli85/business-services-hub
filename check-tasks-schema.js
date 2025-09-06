const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTasksSchema() {
  console.log('🔍 Checking tasks table schema...\n');

  try {
    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;` 
      });

    if (columnsError) {
      console.log('❌ Columns check error:', columnsError);
      
      // Alternative method
      console.log('\n📋 Trying alternative method...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log('❌ Sample data error:', sampleError);
      } else {
        console.log('✅ Sample task structure:');
        if (sampleData.length > 0) {
          Object.keys(sampleData[0]).forEach(key => {
            console.log(`  - ${key}: ${typeof sampleData[0][key]}`);
          });
        }
      }
    } else {
      console.log('✅ Tasks table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check if booking_id exists
    console.log('\n🔍 Checking for booking_id column...');
    const { data: bookingIdCheck, error: bookingIdError } = await supabase
      .from('tasks')
      .select('booking_id')
      .limit(1);

    if (bookingIdError) {
      console.log('❌ booking_id column does not exist:', bookingIdError.message);
    } else {
      console.log('✅ booking_id column exists');
    }

    // Check milestones table structure
    console.log('\n🔍 Checking milestones table...');
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('*')
      .limit(1);

    if (milestonesError) {
      console.log('❌ Milestones error:', milestonesError);
    } else {
      console.log('✅ Sample milestone structure:');
      if (milestones.length > 0) {
        Object.keys(milestones[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof milestones[0][key]}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error during schema check:', error);
  }
}

checkTasksSchema();
