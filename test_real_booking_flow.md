# 🧪 How to Test Your Notification System

## **Step 1: Database Verification** ✅
Run this SQL in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of verify_notification_tables.sql
```

## **Step 2: Frontend Testing** 
1. **Open your application** in the browser
2. **Log in** as a user
3. **Open browser console** (F12 → Console tab)
4. **Run the frontend test**:
```javascript
// Copy and paste the contents of test_frontend_notifications.js
```

## **Step 3: Visual Verification**

### **🔔 Check Notification Bell**
- Look for a bell icon in your header/navigation
- It should show a number (unread count) if you have notifications
- Click it to see a dropdown with recent notifications

### **📱 Check Notification Center**
- Navigate to `/dashboard/notifications`
- You should see a full notification management interface
- Try filtering, marking as read, etc.

### **📧 Check Email Notifications**
- Check your email inbox
- Look for notification emails with your branding
- Emails should have action buttons and professional styling

## **Step 4: Test Real Booking Flow**

### **Create a Test Booking:**
1. **Go to booking creation page** (`/dashboard/bookings/create`)
2. **Fill out the form** with test data
3. **Submit the booking**
4. **Watch for notifications**:
   - Notification bell should show new count
   - Both client and provider should get notifications
   - Check email inbox for notification emails

### **Test Different Events:**
- **Task completion** → Should trigger milestone notifications
- **Payment processing** → Should trigger payment notifications
- **Invoice creation** → Should trigger invoice notifications

## **Step 5: Check User Preferences**

### **Notification Settings:**
1. **Go to notification settings** (`/dashboard/notifications` or settings page)
2. **Toggle different notification types** on/off
3. **Change email preferences** (template style, delivery timing)
4. **Test email verification** if available

## **Step 6: Monitor System**

### **Check Database:**
```sql
-- See all notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- See email logs
SELECT * FROM email_notification_logs ORDER BY sent_at DESC LIMIT 10;

-- Check notification statistics
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN read = false THEN 1 END) as unread
FROM notifications 
GROUP BY type 
ORDER BY count DESC;
```

### **Check Console Logs:**
- Look for any error messages in browser console
- Check network tab for failed API calls
- Monitor Supabase logs for any issues

## **Step 7: Test Edge Cases**

### **Test Different Scenarios:**
- **User with no email** → Should still create in-app notifications
- **Email delivery failure** → Should log error but not break app
- **Large number of notifications** → Should handle pagination
- **Different user roles** → Should respect permissions

## **🎯 Success Indicators**

### **✅ System is Working If:**
- [ ] Notification bell appears in header
- [ ] Clicking bell shows notifications
- [ ] Creating booking triggers notifications
- [ ] Both client and provider get notified
- [ ] Email notifications are sent
- [ ] Notification center page loads
- [ ] User can mark notifications as read
- [ ] Settings page allows customization
- [ ] No console errors
- [ ] Database shows notification records

### **❌ System Needs Fixing If:**
- [ ] Notification bell missing
- [ ] No notifications appear when creating bookings
- [ ] Console shows errors
- [ ] Email notifications not sent
- [ ] Database not storing notifications
- [ ] UI components not loading

## **🚨 Common Issues & Solutions**

### **Issue: Notification bell not showing**
- **Solution**: Check if `NotificationBell` component is imported in your layout
- **Check**: `app/dashboard/layout.tsx` should have the bell component

### **Issue: No notifications when creating bookings**
- **Solution**: Check if notification triggers are called in booking API
- **Check**: `app/api/bookings/route.ts` should have notification trigger calls

### **Issue: Email notifications not working**
- **Solution**: Check if email service is properly configured
- **Check**: Supabase Edge Functions for email sending

### **Issue: Console errors**
- **Solution**: Check TypeScript compilation and fix any type errors
- **Check**: All imports are correct and files exist

## **📞 Need Help?**

If you encounter issues:
1. **Check browser console** for error messages
2. **Check Supabase logs** for database errors
3. **Verify all files exist** and are properly imported
4. **Test with simple data** first before complex scenarios

Your notification system should now be fully functional! 🎉
