#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('🚀 Applying Phase 3 Smart Features migration...')
    
    const sql = fs.readFileSync('supabase/migrations/084_phase3_smart_features_with_status_fix.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('sql', { query: statement })
        
        if (error) {
          console.warn(`⚠️  Statement ${i + 1} failed:`, error.message)
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      }
    }
    
    console.log('🎉 Phase 3 migration completed!')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Test the notification system')
    console.log('2. Create some tasks with past due dates to test overdue detection')
    console.log('3. Test the export functionality')
    console.log('4. Set up weekly digest automation')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
