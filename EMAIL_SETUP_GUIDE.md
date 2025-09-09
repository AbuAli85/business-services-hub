# 📧 Email Notification Setup Guide

## 🚀 Quick Setup (No Docker Required!)

Your email notification system is now ready to use! Here's how to set it up:

### **Step 1: Get Resend API Key**

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the API key

### **Step 2: Add Environment Variables**

Add these to your `.env.local` file:

```bash
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# Email Configuration
NEXT_PUBLIC_EMAIL_FROM_ADDRESS=notifications@yourdomain.com
NEXT_PUBLIC_EMAIL_REPLY_TO_ADDRESS=noreply@yourdomain.com
```

### **Step 3: Test the System**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open your booking page in the browser**

3. **Open browser console (F12) and run:**
   ```javascript
   // Copy and paste this entire code block into your browser console
   async function testEmailNotifications() {
     console.log('🧪 Testing Email Notifications...\n')

     try {
       // 1. Create a test notification
       const { data: testNotification, error: notifError } = await supabase
         .from('notifications')
         .insert({
           user_id: 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0',
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

     } catch (error) {
       console.error('❌ Test failed:', error)
     }
   }

   // Run the test
   testEmailNotifications()
   ```

4. **Check your email inbox!** You should receive a test email.

### **Step 4: Verify Everything Works**

After running the test, you should see:
- ✅ Console message: "Email sent successfully!"
- 📧 Test email in your inbox
- 📊 Email logs in the database

## 🎯 **How It Works Now**

### **Email Flow:**
1. **Notification Created** → In-app notification appears
2. **Email Service Triggered** → Automatically sends email via Resend API
3. **Email Delivered** → User receives beautiful HTML email
4. **Logs Recorded** → Email status tracked in database

### **Email Templates:**
- **Modern** - Beautiful gradient design
- **Minimal** - Clean and simple
- **Corporate** - Professional business style

### **Notification Types:**
- ✅ Booking notifications (created, updated, confirmed, etc.)
- ✅ Task notifications (created, completed, overdue)
- ✅ Milestone notifications (created, completed, overdue)
- ✅ Payment notifications (received, failed)
- ✅ Invoice notifications (created, overdue, paid)

## 🔧 **Troubleshooting**

### **If emails don't send:**
1. Check your Resend API key is correct
2. Verify environment variables are set
3. Check browser console for errors
4. Ensure your domain is verified in Resend

### **If you get API errors:**
1. Make sure you're running `npm run dev`
2. Check that the `/api/send-email` route exists
3. Verify Resend package is installed

## 🚀 **Production Deployment**

When you deploy to production:
1. Add the same environment variables to your hosting platform
2. Verify your domain in Resend
3. Update the `from` email address to your verified domain

## 🎉 **You're All Set!**

Your email notification system is now fully functional without requiring Docker Desktop! Users will receive beautiful, professional emails for all important business events.

**Next time someone books a service, they'll automatically get an email notification!** 📧✨
