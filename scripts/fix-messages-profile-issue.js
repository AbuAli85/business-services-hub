/**
 * Fix messages profile issue - ensure all users have profiles
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

async function fixMessagesProfileIssue() {
  console.log('🔧 Fixing messages profile issue...')
  console.log('')

  try {
    // First, let's check what users exist in auth.users but not in profiles
    console.log('📋 Checking for users without profiles...')
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      return
    }

    console.log(`📊 Found ${authUsers.users.length} users in auth.users`)

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    console.log(`📊 Found ${profiles.length} users in profiles table`)

    // Find users without profiles
    const profileIds = new Set(profiles.map(p => p.id))
    const usersWithoutProfiles = authUsers.users.filter(user => !profileIds.has(user.id))

    console.log(`⚠️ Found ${usersWithoutProfiles.length} users without profiles:`)
    usersWithoutProfiles.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })

    if (usersWithoutProfiles.length === 0) {
      console.log('✅ All users have profiles!')
      return
    }

    console.log('')
    console.log('🔧 Creating missing profiles...')

    // Create profiles for users without them
    for (const user of usersWithoutProfiles) {
      try {
        console.log(`📝 Creating profile for ${user.email}...`)
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'client',
            phone: user.user_metadata?.phone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single()

        if (createError) {
          console.error(`❌ Error creating profile for ${user.email}:`, createError)
        } else {
          console.log(`✅ Created profile for ${user.email}`)
        }
      } catch (error) {
        console.error(`❌ Unexpected error creating profile for ${user.email}:`, error)
      }
    }

    console.log('')
    console.log('🧪 Testing message creation...')

    // Test message creation with a sample user
    if (usersWithoutProfiles.length > 0) {
      const testUser = usersWithoutProfiles[0]
      console.log(`📝 Testing message creation for ${testUser.email}...`)

      // First, let's get a receiver (any existing profile)
      const { data: receivers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1)

      if (receivers && receivers.length > 0) {
        const receiver = receivers[0]
        
        const { data: testMessage, error: testError } = await supabase
          .from('messages')
          .insert({
            sender_id: testUser.id,
            receiver_id: receiver.id,
            content: 'Test message after profile fix',
            subject: 'Test Subject',
            read: false,
            created_at: new Date().toISOString()
          })
          .select('*')
          .single()

        if (testError) {
          console.error('❌ Test message creation failed:', testError)
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
      }
    }

    console.log('')
    console.log('✅ Profile fix completed!')
    console.log('💡 Users should now be able to send and receive messages.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixMessagesProfileIssue()
