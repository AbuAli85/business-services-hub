/**
 * Cleanup orphaned messages - remove messages with non-existent sender/receiver IDs
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

async function cleanupOrphanedMessages() {
  console.log('🧹 Cleaning up orphaned messages...')
  console.log('')

  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    const profileIds = new Set(profiles.map(p => p.id))
    console.log(`📊 Found ${profileIds.size} valid profiles`)

    // Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, created_at')

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError)
      return
    }

    console.log(`📊 Found ${messages.length} total messages`)

    // Find orphaned messages
    const orphanedMessages = messages.filter(message => 
      !profileIds.has(message.sender_id) || 
      !profileIds.has(message.receiver_id) ||
      message.sender_id === null ||
      message.receiver_id === null
    )

    console.log(`⚠️ Found ${orphanedMessages.length} orphaned messages:`)
    orphanedMessages.forEach(message => {
      const senderExists = message.sender_id && profileIds.has(message.sender_id)
      const receiverExists = message.receiver_id && profileIds.has(message.receiver_id)
      console.log(`  - Message ${message.id}:`)
      console.log(`    Sender ${message.sender_id}: ${senderExists ? '✅' : '❌'}`)
      console.log(`    Receiver ${message.receiver_id}: ${receiverExists ? '✅' : '❌'}`)
      console.log(`    Content: ${message.content?.substring(0, 50)}...`)
      console.log(`    Created: ${message.created_at}`)
      console.log('')
    })

    if (orphanedMessages.length === 0) {
      console.log('✅ No orphaned messages found!')
      return
    }

    // Ask for confirmation (in a real scenario, you might want to add a confirmation prompt)
    console.log('🗑️ Deleting orphaned messages...')
    
    const orphanedIds = orphanedMessages.map(m => m.id)
    
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', orphanedIds)

    if (deleteError) {
      console.error('❌ Error deleting orphaned messages:', deleteError)
    } else {
      console.log(`✅ Successfully deleted ${orphanedMessages.length} orphaned messages`)
    }

    console.log('')
    console.log('✅ Cleanup completed!')
    console.log('💡 The messaging system should now work without foreign key constraint issues.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the cleanup
cleanupOrphanedMessages()
