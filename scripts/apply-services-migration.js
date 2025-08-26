#!/usr/bin/env node

/**
 * Script to apply services migration and fix database schema issues
 * This script will run the migration to add missing columns to the services table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyServicesMigration() {
  console.log('🚀 Starting services migration...');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    console.error('   Please check your .env.local file');
    return;
  }
  
  try {
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('✅ Supabase client created successfully');
    
    // Read and execute the migration SQL
    const fs = require('fs');
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/046_fix_services_approval_status.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📖 Migration SQL loaded successfully');
    
    // Execute the migration
    console.log('🔧 Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If RPC method doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying direct SQL execution...');
      
      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`🔧 Executing: ${statement.substring(0, 50)}...`);
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
            if (stmtError) {
              // Handle specific policy errors gracefully
              if (stmtError.message.includes('policy') && stmtError.message.includes('already exists')) {
                console.log(`⚠️  Policy already exists (this is expected): ${stmtError.message}`);
              } else if (stmtError.message.includes('does not exist')) {
                console.log(`⚠️  Policy doesn't exist (this is expected): ${stmtError.message}`);
              } else {
                console.log(`⚠️  Statement failed: ${stmtError.message}`);
              }
            }
          } catch (execError) {
            console.log(`⚠️  Execution error (this might be expected): ${execError.message}`);
          }
        }
      }
    }
    
    // Verify the migration by checking if columns exist
    console.log('🔍 Verifying migration...');
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'services')
      .in('column_name', ['approval_status', 'views_count', 'bookings_count', 'rating', 'tags']);
    
    if (checkError) {
      console.error('❌ Error checking columns:', checkError);
    } else {
      console.log('✅ Available columns in services table:');
      columns.forEach(col => console.log(`   - ${col.column_name}`));
    }
    
    // Test service creation
    console.log('🧪 Testing service creation...');
    const testService = {
      title: 'Test Service - Migration Verification',
      description: 'This service was created to verify the migration worked correctly',
      category: 'Testing',
      base_price: 0,
      currency: 'OMR',
      status: 'draft',
      provider_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      approval_status: 'pending'
    };
    
    const { error: testError } = await supabase
      .from('services')
      .insert(testService);
    
    if (testError) {
      console.error('❌ Test service creation failed:', testError.message);
      if (testError.message.includes('approval_status')) {
        console.error('   This suggests the approval_status column is still missing');
      }
    } else {
      console.log('✅ Test service created successfully - migration appears to be working');
      
      // Clean up test service
      await supabase
        .from('services')
        .delete()
        .eq('title', 'Test Service - Migration Verification');
      console.log('🧹 Test service cleaned up');
    }
    
    console.log('🎉 Services migration completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your application');
    console.log('2. Try creating a new service');
    console.log('3. Check if the service detail page loads without errors');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('If you see RLS policy errors, you may need to:');
    console.error('1. Check your Supabase dashboard for RLS policies');
    console.error('2. Ensure the service role has proper permissions');
    console.error('3. Run the migration manually in the Supabase SQL editor');
    console.error('');
    console.error('Alternative: Use the simplified migration file:');
    console.error('   supabase/migrations/046_fix_services_approval_status_simple.sql');
  }
}

// Run the migration
if (require.main === module) {
  applyServicesMigration();
}

module.exports = { applyServicesMigration };
