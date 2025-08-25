#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Applying Approval Workflow Migration...');

// Read environment variables manually
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  }
} catch (error) {
  console.error('Error reading .env file:', error);
}

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  console.log('You can either:');
  console.log('1. Set them as environment variables');
  console.log('2. Create a .env file in your project root');
  console.log('3. Run the migration manually in Supabase dashboard');
  console.log('');
  console.log('Migration file: supabase/migrations/045_add_approval_workflow.sql');
  console.log('🎉 Setup script completed');
  process.exit(0);
}

console.log('✅ Environment variables loaded');
console.log('📊 Supabase URL:', supabaseUrl);

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '045_add_approval_workflow.sql');
let migrationContent = '';

try {
  migrationContent = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded');
} catch (error) {
  console.error('❌ Error reading migration file:', error);
  process.exit(1);
}

console.log('');
console.log('📋 Migration Summary:');
console.log('• Add approval workflow fields to bookings table');
console.log('• Create approval history tracking table');
console.log('• Create operational tracking table');
console.log('• Update enhanced_bookings view with new fields');
console.log('• Add RLS policies for new tables');
console.log('');

console.log('🔧 To apply this migration:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of: supabase/migrations/045_add_approval_workflow.sql');
console.log('4. Execute the migration');
console.log('');

console.log('📁 Migration file location:', migrationPath);
console.log('🎉 Setup script completed');
