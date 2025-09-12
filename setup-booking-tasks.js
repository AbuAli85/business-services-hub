const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupBookingTasks() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials. Please check your .env file');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('🔍 Checking if booking_tasks table exists...');
    
    // Check if table exists
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'booking_tasks')
      .eq('table_schema', 'public');
    
    if (checkError) {
      console.log('⚠️  Could not check table existence, proceeding with creation...');
    } else if (tables && tables.length > 0) {
      console.log('✅ booking_tasks table already exists');
      return;
    }
    
    console.log('📝 Creating booking_tasks table...');
    
    // Create table using SQL
    const createTableSQL = `
      CREATE TABLE booking_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        assigned_to UUID REFERENCES profiles(id),
        due_date TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    if (createError) {
      console.log('⚠️  Table creation failed, trying alternative method...');
      
      // Try using the Supabase dashboard SQL editor approach
      console.log('📋 Please run this SQL in your Supabase dashboard SQL editor:');
      console.log(createTableSQL);
      console.log('\nThen run this script again to continue with RLS policies.');
      return;
    }
    
    console.log('✅ booking_tasks table created successfully');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking_id ON booking_tasks(booking_id);',
      'CREATE INDEX IF NOT EXISTS idx_booking_tasks_status ON booking_tasks(status);',
      'CREATE INDEX IF NOT EXISTS idx_booking_tasks_assigned_to ON booking_tasks(assigned_to);'
    ];
    
    for (const indexSQL of indexes) {
      await supabase.rpc('exec', { sql: indexSQL });
    }
    
    console.log('✅ Indexes created');
    
    // Enable RLS
    console.log('🔒 Setting up RLS policies...');
    const rlsSQL = `
      ALTER TABLE booking_tasks ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view tasks for their bookings" ON booking_tasks
        FOR SELECT USING (
          booking_id IN (
            SELECT id FROM bookings 
            WHERE client_id = auth.uid() OR provider_id = auth.uid()
          )
        );
      
      CREATE POLICY "Providers can manage tasks for their bookings" ON booking_tasks
        FOR ALL USING (
          booking_id IN (
            SELECT id FROM bookings WHERE provider_id = auth.uid()
          )
        );
    `;
    
    const { error: rlsError } = await supabase.rpc('exec', { sql: rlsSQL });
    if (rlsError) {
      console.log('⚠️  RLS setup failed, please run this SQL manually:');
      console.log(rlsSQL);
    } else {
      console.log('✅ RLS policies created');
    }
    
    console.log('🎉 booking_tasks table setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up booking_tasks:', error.message);
  }
}

setupBookingTasks();
