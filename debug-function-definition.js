const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFunctionDefinition() {
  console.log('🔍 DEBUGGING FUNCTION DEFINITION\n')
  console.log('='.repeat(50))

  try {
    // Try to get the function definition
    console.log('📋 1. CHECKING FUNCTION DEFINITION')
    console.log('-'.repeat(40))
    
    const { data: functionDef, error: functionError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT pg_get_functiondef(oid) as definition 
              FROM pg_proc 
              WHERE proname = 'add_task' 
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')` 
      })
    
    if (functionError) {
      console.log(`❌ Error getting function definition: ${functionError.message}`)
    } else {
      console.log(`✅ Function definition found:`)
      console.log(functionDef)
    }

    // Try a different approach - check if the function exists
    console.log('\n📋 2. CHECKING FUNCTION EXISTS')
    console.log('-'.repeat(40))
    
    const { data: functionExists, error: existsError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT proname, pronargs, proargnames 
              FROM pg_proc 
              WHERE proname = 'add_task' 
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')` 
      })
    
    if (existsError) {
      console.log(`❌ Error checking function existence: ${existsError.message}`)
    } else {
      console.log(`✅ Function exists:`)
      console.log(functionExists)
    }

    // Try to create a simple test function to see if the issue is with the specific function
    console.log('\n📋 3. TESTING SIMPLE FUNCTION CREATION')
    console.log('-'.repeat(40))
    
    const { data: testFunction, error: testError } = await supabase
      .rpc('exec_sql', { 
        sql: `CREATE OR REPLACE FUNCTION test_simple_function()
              RETURNS text AS $$
              BEGIN
                RETURN 'test successful';
              END;
              $$ LANGUAGE plpgsql;` 
      })
    
    if (testError) {
      console.log(`❌ Error creating test function: ${testError.message}`)
    } else {
      console.log(`✅ Test function created successfully`)
      
      // Test the simple function
      const { data: testResult, error: testResultError } = await supabase
        .rpc('test_simple_function')
      
      if (testResultError) {
        console.log(`❌ Error calling test function: ${testResultError.message}`)
      } else {
        console.log(`✅ Test function result: ${testResult}`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 FUNCTION DEBUG COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugFunctionDefinition()
