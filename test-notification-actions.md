# 🧪 Notification Testing Guide

## Test Actions to Trigger Notifications

### 1. **Booking Notifications**
- **Create a booking** → Should trigger `booking_created` notification
- **Approve a booking** → Should trigger `booking_approved` notification  
- **Cancel a booking** → Should trigger `booking_cancelled` notification
- **Complete a booking** → Should trigger `booking_completed` notification

### 2. **Message Notifications**
- **Send a message** to another user → Should trigger `message_received` notification

### 3. **Review Notifications**
- **Submit a review** for a service → Should trigger review notification to provider

### 4. **Service Notifications**
- **Create a new service** → Should trigger `service_created` notification

### 5. **Invoice Notifications**
- **Approve a booking** → Should automatically create invoice and trigger `invoice_created` notification

### 6. **Task Notifications**
- **Create a task** in a milestone → Should trigger `task_created` notification
- **Complete a task** → Should trigger `task_completed` notification

### 7. **Milestone Notifications**
- **Create a milestone** → Should trigger `milestone_created` notification
- **Complete a milestone** → Should trigger `milestone_completed` notification

## Expected Results

### ✅ What You Should See:
1. **Notification Bell** shows unread count
2. **Notification Center** displays all notifications
3. **Proper notification types** (not generic "booking")
4. **Rich content** with titles, messages, and action buttons
5. **Email notifications** (if email is configured)

### ❌ What Indicates Problems:
1. **No notifications** appearing after actions
2. **Generic notification types** like "booking" instead of specific types
3. **Missing notification content** or empty messages
4. **Notifications not marked as read** when clicked
5. **Email notifications not sent** (check email service configuration)

## Database Verification

Run this query in Supabase SQL Editor to check notifications:

```sql
-- Check recent notifications
SELECT 
  type,
  title,
  message,
  read,
  created_at,
  user_id
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check notification types distribution
SELECT 
  type,
  COUNT(*) as count
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- Check unread notifications
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM notifications 
WHERE read = false 
GROUP BY user_id;
```

## Email Testing

If email notifications are configured:

1. **Check email service** (Resend/SendGrid) dashboard for sent emails
2. **Verify email templates** are being used
3. **Check spam folder** for test emails
4. **Test with different email addresses**

## Performance Testing

1. **Create multiple notifications** quickly
2. **Check database performance** with large notification volumes
3. **Verify notification center** loads quickly with many notifications
4. **Test notification pagination** if implemented

## Troubleshooting

### Common Issues:
1. **Notifications not created** → Check API routes have notification triggers
2. **Wrong notification types** → Verify type mapping in notification service
3. **Missing email notifications** → Check email service configuration
4. **Notifications not showing in UI** → Check notification center component
5. **Database errors** → Check RLS policies and table permissions

### Debug Steps:
1. **Check browser console** for JavaScript errors
2. **Check server logs** for API errors
3. **Verify database permissions** for notification tables
4. **Test notification triggers** individually
5. **Check notification settings** for users
