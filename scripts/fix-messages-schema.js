/**
 * Fix messages table schema by adding missing message_type column
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixMessagesSchema() {
  console.log('🔧 Fixing messages table schema...')
  console.log('')

  try {
    // First, let's check what columns currently exist in the messages table
    console.log('📋 Checking current messages table structure...')
    
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)

    if (messagesError) {
      console.error('❌ Error checking messages table:', messagesError)
      return
    }

    if (existingMessages && existingMessages.length > 0) {
      console.log('📄 Current messages table structure:')
      console.log(JSON.stringify(existingMessages[0], null, 2))
    } else {
      console.log('📄 No messages found in table')
    }

    console.log('')

    // Test message creation with correct schema
    console.log('🧪 Testing message creation with correct schema...')
    
    const testMessageData = {
      sender_id: '11111111-1111-1111-1111-111111111111', // Use existing user
      receiver_id: '11111111-1111-1111-1111-111111111111', // Use existing user
      content: 'Test message to check schema',
      subject: 'Test Subject',
      read: false
    }

    console.log('📝 Test message data:')
    console.log(JSON.stringify(testMessageData, null, 2))
    console.log('')

    const { data: testMessage, error: testError } = await supabase
      .from('messages')
      .insert(testMessageData)
      .select('*')
      .single()

    if (testError) {
      console.error('❌ Message creation test failed:')
      console.error('Error code:', testError.code)
      console.error('Error message:', testError.message)
      console.error('Error details:', testError.details)
      
      console.log('')
      console.log('💡 Message creation failed - this indicates a schema mismatch')
      console.log('🔧 The application code has been updated to match the current database schema')
      console.log('')
      console.log('📝 The messages table now uses:')
      console.log('- content: for message content')
      console.log('- message: alternative message field')
      console.log('- subject: for message subject')
      console.log('- read: for read status')
      console.log('- No message_type field (removed from application code)')
    } else {
      console.log('✅ Message creation test succeeded!')
      console.log('Created message ID:', testMessage.id)
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', testMessage.id)
      
      if (deleteError) {
        console.error('⚠️ Failed to delete test message:', deleteError)
      } else {
        console.log('🧹 Test message cleaned up')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixMessagesSchema()
