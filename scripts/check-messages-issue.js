/**
 * Check messages issue - diagnose the profile problem
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

async function checkMessagesIssue() {
  console.log('🔍 Checking messages issue...')
  console.log('')

  try {
    // Check existing profiles
    console.log('📋 Checking existing profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    console.log(`📊 Found ${profiles.length} profiles:`)
    profiles.forEach(profile => {
      console.log(`  - ${profile.full_name} (${profile.email}) - Role: ${profile.role}`)
    })

    console.log('')

    // Check existing messages
    console.log('📋 Checking existing messages...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError)
      return
    }

    console.log(`📊 Found ${messages.length} messages:`)
    messages.forEach(message => {
      console.log(`  - From: ${message.sender_id} | To: ${message.receiver_id} | Content: ${message.content?.substring(0, 50)}...`)
    })

    console.log('')

    // Check for orphaned messages (messages with sender/receiver IDs that don't exist in profiles)
    console.log('🔍 Checking for orphaned messages...')
    const profileIds = new Set(profiles.map(p => p.id))
    const orphanedMessages = messages.filter(message => 
      !profileIds.has(message.sender_id) || !profileIds.has(message.receiver_id)
    )

    if (orphanedMessages.length > 0) {
      console.log(`⚠️ Found ${orphanedMessages.length} orphaned messages:`)
      orphanedMessages.forEach(message => {
        const senderExists = profileIds.has(message.sender_id)
        const receiverExists = profileIds.has(message.receiver_id)
        console.log(`  - Message ${message.id}:`)
        console.log(`    Sender ${message.sender_id}: ${senderExists ? '✅' : '❌'}`)
        console.log(`    Receiver ${message.receiver_id}: ${receiverExists ? '✅' : '❌'}`)
      })
    } else {
      console.log('✅ No orphaned messages found')
    }

    console.log('')

    // Test message creation with existing profiles
    if (profiles.length >= 2) {
      console.log('🧪 Testing message creation...')
      
      const sender = profiles[0]
      const receiver = profiles[1]
      
      console.log(`📝 Testing message from ${sender.full_name} to ${receiver.full_name}...`)

      const { data: testMessage, error: testError } = await supabase
        .from('messages')
        .insert({
          sender_id: sender.id,
          receiver_id: receiver.id,
          content: 'Test message to verify functionality',
          subject: 'Test Subject',
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (testError) {
        console.error('❌ Test message creation failed:', testError)
        console.error('Error details:', testError.details)
        console.error('Error hint:', testError.hint)
      } else {
        console.log('✅ Test message creation succeeded!')
        console.log(`   Message ID: ${testMessage.id}`)
        
        // Clean up test message
        await supabase
          .from('messages')
          .delete()
          .eq('id', testMessage.id)
        console.log('🧹 Test message cleaned up')
      }
    } else {
      console.log('⚠️ Not enough profiles to test message creation')
    }

    console.log('')
    console.log('💡 Recommendations:')
    console.log('1. Ensure all users have corresponding profiles')
    console.log('2. Check that the messages API creates profiles automatically')
    console.log('3. Verify foreign key constraints in the messages table')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkMessagesIssue()
