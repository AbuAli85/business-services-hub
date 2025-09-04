const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addStatusColumn() {
  try {
    console.log('🚀 Adding status column to bookings table...');
    
    // Read the migration file
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('supabase/migrations/093_add_status_column_direct.sql', 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('sql', { query: migrationSQL });
    
    if (error) {
      console.error('❌ Error adding status column:', error);
      return;
    }
    
    console.log('✅ Status column added successfully!');
    console.log('📊 Migration result:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addStatusColumn();
