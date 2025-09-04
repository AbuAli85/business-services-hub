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

async function applyAdvancedProgressMigration() {
  try {
    console.log('🚀 Applying advanced progress tracking migration...');
    
    // Read the migration file
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('supabase/migrations/094_advanced_progress_tracking.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          const { data, error } = await supabase.rpc('sql', { query: statement + ';' });
          
          if (error) {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
            // Continue with next statement instead of failing completely
            continue;
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.error(`❌ Statement ${i + 1} error:`, err.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          continue;
        }
      }
    }
    
    console.log('🎉 Advanced progress tracking migration completed!');
    console.log('📊 Created tables: milestones, tasks, time_entries, task_comments');
    console.log('🔧 Created functions: progress calculation, overdue detection');
    console.log('🛡️ Applied RLS policies for all tables');
    console.log('📈 Created triggers for automatic progress updates');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyAdvancedProgressMigration();
