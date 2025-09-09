// Simple email notification test
// Run this in your browser console on your booking page

async function testEmailNotifications() {
  console.log('🧪 Testing Email Notifications...\n')

  try {
    // 1. Create a test notification
    const { data: testNotification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0', // Your user ID
        type: 'booking_confirmed',
        title: 'Test Email Notification - ' + new Date().toLocaleTimeString(),
        message: 'This is a test email notification to verify the system is working.',
        priority: 'high',
        data: {
          booking_id: '0049dcf7-de0e-4959-99fa-c99df07ced72',
          booking_title: 'Website Development Package',
          service_name: 'Web Development Service',
          scheduled_date: new Date().toLocaleDateString()
        },
        action_url: '/dashboard/bookings/0049dcf7-de0e-4959-99fa-c99df07ced72',
        action_label: 'View Booking'
      })
      .select()
      .single()

    if (notifError) {
      console.error('❌ Error creating notification:', notifError)
      return
    }

    console.log('✅ Test notification created:', testNotification.id)

    // 2. Test the email API directly
    const emailResponse = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'operations@falconeyegroup.net', // Your email
        subject: 'Test Email from Business Services Hub',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Test Email Notification</h2>
            <p>This is a test email to verify the notification system is working.</p>
            <p><strong>Notification ID:</strong> ${testNotification.id}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #007bff;">
              <p style="margin: 0;"><strong>System Status:</strong> Email notifications are working! 🎉</p>
            </div>
          </div>
        `,
        text: `Test Email Notification\n\nThis is a test email to verify the notification system is working.\n\nNotification ID: ${testNotification.id}\nTime: ${new Date().toLocaleString()}\n\nSystem Status: Email notifications are working! 🎉`,
        from: 'notifications@yourdomain.com',
        replyTo: 'noreply@yourdomain.com',
        notificationId: testNotification.id,
        notificationType: 'booking_confirmed',
        userId: 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0'
      }),
    })

    const emailResult = await emailResponse.json()
    
    if (emailResponse.ok) {
      console.log('✅ Email sent successfully!', emailResult)
      console.log('📧 Check your email inbox for the test message!')
    } else {
      console.error('❌ Email sending failed:', emailResult)
    }

    // 3. Check email logs
    setTimeout(async () => {
      const { data: emailLogs } = await supabase
        .from('email_notification_logs')
        .select('*')
        .eq('notification_id', testNotification.id)
      
      console.log('📧 Email logs:', emailLogs)
    }, 2000)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEmailNotifications()