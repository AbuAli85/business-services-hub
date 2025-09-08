// Check database schema and fix queries
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...')
    
    // Check if milestones table exists and what columns it has
    const { data: milestonesColumns, error: milestonesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'milestones')
      .order('ordinal_position')
    
    if (milestonesError) {
      console.error('Error checking milestones table:', milestonesError)
      return
    }
    
    console.log('📋 Milestones table columns:')
    milestonesColumns?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`)
    })
    
    // Check if tasks table exists and what columns it has
    const { data: tasksColumns, error: tasksError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'tasks')
      .order('ordinal_position')
    
    if (tasksError) {
      console.error('Error checking tasks table:', tasksError)
      return
    }
    
    console.log('📋 Tasks table columns:')
    tasksColumns?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`)
    })
    
    // Check if due_date column exists in milestones
    const hasDueDate = milestonesColumns?.some(col => col.column_name === 'due_date')
    console.log(`\n✅ Milestones table has due_date column: ${hasDueDate}`)
    
    // Check if due_date column exists in tasks
    const tasksHasDueDate = tasksColumns?.some(col => col.column_name === 'due_date')
    console.log(`✅ Tasks table has due_date column: ${tasksHasDueDate}`)
    
    // Try to query milestones to see what happens
    console.log('\n🧪 Testing milestones query...')
    const { data: milestones, error: milestonesQueryError } = await supabase
      .from('milestones')
      .select('id, title, due_date')
      .limit(1)
    
    if (milestonesQueryError) {
      console.error('❌ Milestones query failed:', milestonesQueryError.message)
    } else {
      console.log('✅ Milestones query successful')
      console.log('Sample milestone:', milestones?.[0])
    }
    
  } catch (error) {
    console.error('Error checking schema:', error)
  }
}

checkSchema()
