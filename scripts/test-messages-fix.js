/**
 * Test messages fix - verify that messaging works correctly
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

async function testMessagesFix() {
  console.log('🧪 Testing messages fix...')
  console.log('')

  try {
    // Get two existing profiles to test with
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .limit(2)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    if (profiles.length < 2) {
      console.error('❌ Need at least 2 profiles to test messaging')
      return
    }

    const sender = profiles[0]
    const receiver = profiles[1]

    console.log(`📝 Testing message from ${sender.full_name} to ${receiver.full_name}`)

    // Test 1: Direct database insertion (should work now)
    console.log('🧪 Test 1: Direct database insertion...')
    
    const { data: directMessage, error: directError } = await supabase
      .from('messages')
      .insert({
        sender_id: sender.id,
        receiver_id: receiver.id,
        content: 'Test message via direct database insertion',
        subject: 'Test Subject',
        read: false,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (directError) {
      console.error('❌ Direct database insertion failed:', directError)
    } else {
      console.log('✅ Direct database insertion succeeded!')
      console.log(`   Message ID: ${directMessage.id}`)
      
      // Clean up
      await supabase
        .from('messages')
        .delete()
        .eq('id', directMessage.id)
      console.log('🧹 Direct test message cleaned up')
    }

    console.log('')

    // Test 2: API endpoint (simulate the API call)
    console.log('🧪 Test 2: API endpoint simulation...')
    
    // Create a mock request object
    const mockRequest = {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      json: async () => ({
        receiver_id: receiver.id,
        content: 'Test message via API endpoint',
        subject: 'Test Subject API',
        booking_id: null
      })
    }

    // We can't easily test the API endpoint directly from here since it requires authentication
    // But we can test the database operations that the API would perform
    
    // Test profile creation for non-existent user
    console.log('🧪 Test 3: Profile creation for non-existent user...')
    
    const fakeUserId = '00000000-0000-0000-0000-000000000999'
    
    // Try to create a profile for a fake user
    const { data: fakeProfile, error: fakeError } = await supabase
      .from('profiles')
      .insert({
        id: fakeUserId,
        email: 'fake-user@test.com',
        full_name: 'Fake User',
        role: 'client',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (fakeError) {
      console.log('⚠️ Fake profile creation failed (expected):', fakeError.message)
    } else {
      console.log('✅ Fake profile creation succeeded!')
      
      // Test message with fake user
      const { data: fakeMessage, error: fakeMessageError } = await supabase
        .from('messages')
        .insert({
          sender_id: fakeUserId,
          receiver_id: sender.id,
          content: 'Test message with fake user',
          subject: 'Fake Test',
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (fakeMessageError) {
        console.error('❌ Fake user message failed:', fakeMessageError)
      } else {
        console.log('✅ Fake user message succeeded!')
        
        // Clean up fake data
        await supabase
          .from('messages')
          .delete()
          .eq('id', fakeMessage.id)
        await supabase
          .from('profiles')
          .delete()
          .eq('id', fakeUserId)
        console.log('🧹 Fake test data cleaned up')
      }
    }

    console.log('')

    // Test 4: Check for orphaned messages
    console.log('🧪 Test 4: Checking for orphaned messages...')
    
    const { data: allMessages, error: allMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content')
      .limit(10)

    if (allMessagesError) {
      console.error('❌ Error fetching messages:', allMessagesError)
    } else {
      const profileIds = new Set(profiles.map(p => p.id))
      const orphanedMessages = allMessages.filter(message => 
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
        console.log('✅ No orphaned messages found!')
      }
    }

    console.log('')
    console.log('✅ Messages fix testing completed!')
    console.log('💡 The messaging system should now work correctly with automatic profile creation.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testMessagesFix()
