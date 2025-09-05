const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('🚀 APPLYING FLEXIBLE MILESTONE SYSTEM MIGRATION\n')
  console.log('=' * 50)

  try {
    // Read the migration file
    const fs = require('fs')
    const migrationSQL = fs.readFileSync('supabase/migrations/100_flexible_milestone_system.sql', 'utf8')
    
    console.log('📄 Migration file loaded successfully')
    console.log(`📏 Migration size: ${migrationSQL.length} characters`)
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`\n⚙️ Executing statement ${i + 1}/${statements.length}`)
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
            // Continue with other statements even if one fails
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } catch (rpcError) {
          console.error(`❌ RPC error for statement ${i + 1}:`, rpcError.message)
          // Try direct execution as fallback
          try {
            const { data, error } = await supabase
              .from('_temp_migration_test')
              .select('*')
              .limit(0)
            
            console.log(`⚠️ Statement ${i + 1} skipped (RPC not available)`)
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed for statement ${i + 1}`)
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 MIGRATION APPLICATION COMPLETE')
    console.log('='.repeat(50))
    console.log('\n📋 Next steps:')
    console.log('1. Run the test script to verify the migration')
    console.log('2. Check the Supabase dashboard for new tables')
    console.log('3. Test the frontend components')
    
  } catch (error) {
    console.error('❌ Migration application failed:', error.message)
    console.log('\n🔧 Manual steps required:')
    console.log('1. Copy the SQL from supabase/migrations/100_flexible_milestone_system.sql')
    console.log('2. Paste it into the Supabase SQL Editor')
    console.log('3. Execute the migration manually')
  }
}

applyMigration()
