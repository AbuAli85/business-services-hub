// Find the correct user ID for your email preferences
// Run this in your browser console on your booking page

async function findCorrectUserId() {
  console.log('🔍 Finding the correct user ID...\n')

  try {
    // 1. Check what user IDs exist in notifications
    console.log('1️⃣ Checking notifications table...')
    
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('user_id, title, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (notifError) {
      console.error('❌ Error loading notifications:', notifError)
      return
    }

    console.log('✅ Notifications found:', notifications)

    // 2. Check what user IDs exist in profiles
    console.log('\n2️⃣ Checking profiles table...')
    
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (profError) {
      console.error('❌ Error loading profiles:', profError)
      return
    }

    console.log('✅ Profiles found:', profiles)

    // 3. Find the user who has the notification we're working with
    console.log('\n3️⃣ Finding user for your notification...')
    
    const { data: notificationUser, error: notifUserError } = await supabase
      .from('notifications')
      .select(`
        user_id,
        title,
        message,
        created_at,
        profiles!inner(email, full_name, role)
      `)
      .eq('id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')
      .single()

    if (notifUserError) {
      console.error('❌ Error loading notification user:', notifUserError)
      return
    }

    console.log('✅ Notification user found:', notificationUser)

    // 4. Check if this user exists in auth.users
    console.log('\n4️⃣ Checking if user exists in auth.users...')
    
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.log('⚠️ Auth user error:', authError.message)
      } else {
        console.log('✅ Current auth user:', authUser.user)
        
        // Check if the notification user matches the auth user
        if (authUser.user && authUser.user.id === notificationUser.user_id) {
          console.log('✅ Notification user matches current auth user!')
        } else {
          console.log('⚠️ Notification user does not match current auth user')
        }
      }
    } catch (authError) {
      console.log('⚠️ Auth check failed:', authError.message)
    }

    // 5. Summary and recommendations
    console.log('\n🎯 SUMMARY:')
    console.log('===========')
    console.log('Notification user ID:', notificationUser.user_id)
    console.log('User email:', notificationUser.profiles.email)
    console.log('User name:', notificationUser.profiles.full_name)
    console.log('User role:', notificationUser.profiles.role)

    console.log('\n💡 RECOMMENDATIONS:')
    if (notificationUser.user_id) {
      console.log('✅ Use this user ID for email preferences:', notificationUser.user_id)
      console.log('✅ This user has email:', notificationUser.profiles.email)
      console.log('✅ This user has name:', notificationUser.profiles.full_name)
    } else {
      console.log('❌ No user found for this notification')
    }

    // 6. Test creating email preferences for this user
    console.log('\n6️⃣ Testing email preferences creation...')
    
    try {
      const { data: emailPrefs, error: prefError } = await supabase
        .from('user_email_preferences')
        .insert({
          user_id: notificationUser.user_id,
          email_enabled: true,
          template_style: 'modern',
          delivery_frequency: 'immediate',
          disabled_types: []
        })
        .select()
        .single()

      if (prefError) {
        console.error('❌ Error creating email preferences:', prefError)
      } else {
        console.log('✅ Email preferences created successfully:', emailPrefs)
      }
    } catch (prefError) {
      console.log('⚠️ Email preferences test failed:', prefError.message)
    }

  } catch (error) {
    console.error('❌ Find user ID failed:', error)
  }
}

// Run the finder
findCorrectUserId()
