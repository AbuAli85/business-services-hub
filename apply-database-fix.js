// Apply database schema fix
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables from env.example
const envExample = fs.readFileSync('env.example', 'utf8')
const envLines = envExample.split('\n')
const envVars = {}
envLines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=')
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyDatabaseFix() {
  try {
    console.log('🔧 Applying database schema fix...')
    
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync('fix-due-date-column.sql', 'utf8')
    
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
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message)
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} error:`, err.message)
        }
      }
    }
    
    // Test the fix by querying milestones
    console.log('\n🧪 Testing the fix...')
    const { data: milestones, error: testError } = await supabase
      .from('milestones')
      .select('id, title, due_date')
      .limit(1)
    
    if (testError) {
      console.error('❌ Test query failed:', testError.message)
    } else {
      console.log('✅ Test query successful! due_date column is now available')
      console.log('Sample milestone:', milestones?.[0])
    }
    
    console.log('\n🎉 Database schema fix completed!')
    
  } catch (error) {
    console.error('❌ Error applying database fix:', error)
  }
}

// Check if we can use RPC function
async function checkRPC() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
    if (error) {
      console.log('⚠️  RPC function not available, trying alternative approach...')
      return false
    }
    return true
  } catch (err) {
    console.log('⚠️  RPC function not available, trying alternative approach...')
    return false
  }
}

async function main() {
  console.log('🚀 Starting database schema fix...')
  
  const canUseRPC = await checkRPC()
  
  if (!canUseRPC) {
    console.log('📋 Please apply the following SQL manually in your Supabase dashboard:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of fix-due-date-column.sql')
    console.log('4. Execute the SQL')
    console.log('\nAlternatively, you can run: supabase db push (if Docker Desktop is running)')
    return
  }
  
  await applyDatabaseFix()
}

main()
