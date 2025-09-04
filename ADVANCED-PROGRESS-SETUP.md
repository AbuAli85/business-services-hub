# Advanced Progress Tracking Setup Guide

## 🚨 **IMPORTANT: Database Schema Required**

The advanced progress tracking system requires database tables to be created. The automated migration failed due to Supabase RPC limitations, so you need to manually apply the database schema.

## 📋 **Step-by-Step Setup Instructions**

### **Step 1: Access Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"** to create a new SQL script

### **Step 2: Apply Database Schema**
1. Copy the **entire contents** of the file: `supabase/migrations/094_advanced_progress_tracking.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script

### **Step 3: Verify Tables Created**
After running the script, verify these tables were created:
- ✅ `milestones` - Project milestones
- ✅ `tasks` - Individual tasks within milestones  
- ✅ `time_entries` - Time tracking entries
- ✅ `task_comments` - Task comments and discussions

### **Step 4: Test the System**
1. Refresh your booking dashboard
2. Navigate to the **"Progress"** tab
3. You should now see the advanced progress tracking interface

## 🎯 **What You'll Get After Setup**

### **For Providers:**
- ✅ Create and manage milestones
- ✅ Add tasks with steps, tags, and priorities
- ✅ Start/stop time tracking
- ✅ Add internal notes
- ✅ View progress analytics

### **For Clients:**
- ✅ View project progress and milestones
- ✅ Add comments and feedback
- ✅ Approve/reject completed tasks
- ✅ See real-time progress updates

### **Smart Features:**
- ✅ Overdue detection with red badges
- ✅ Real-time progress calculations
- ✅ Weekly progress summaries
- ✅ Notifications for approvals and overdue items

## 🔧 **Troubleshooting**

### **If you see "Setup Required" message:**
- The database schema hasn't been applied yet
- Follow the setup instructions above

### **If you see errors after setup:**
- Check that all tables were created successfully
- Verify RLS policies are in place
- Check the browser console for specific error messages

### **If the interface doesn't load:**
- Refresh the page after applying the schema
- Clear browser cache if needed
- Check that you're logged in as a provider or client

## 📊 **Database Schema Overview**

The system creates these main tables:

```sql
-- Core Tables
milestones (id, booking_id, title, description, due_date, status, priority, progress_percentage, weight, etc.)
tasks (id, milestone_id, title, description, status, priority, due_date, progress_percentage, estimated_hours, actual_hours, tags, steps, approval_status, etc.)
time_entries (id, task_id, user_id, description, start_time, end_time, duration_minutes, is_active, etc.)
task_comments (id, task_id, user_id, comment, is_internal, created_at, etc.)

-- Functions & Triggers
calculate_milestone_progress() - Calculates milestone progress from tasks
calculate_booking_progress() - Calculates overall booking progress from milestones
update_overdue_status() - Updates overdue status for tasks and milestones
Automatic progress update triggers - Updates progress when tasks change
RLS policies - Security policies for all tables
```

## 🎉 **After Setup Complete**

Once the database schema is applied, you'll have access to:

1. **List View** - Detailed task and milestone management
2. **Kanban View** - Visual task board with status columns
3. **Timeline View** - Project timeline with smart features
4. **Time Tracking** - Start/stop time tracking for tasks
5. **Approval System** - Client approval workflow
6. **Smart Analytics** - Progress insights and overdue detection

The system will automatically:
- Calculate progress percentages
- Detect overdue items
- Send notifications
- Update timelines in real-time

## 📞 **Need Help?**

If you encounter any issues during setup:
1. Check the Supabase logs for SQL errors
2. Verify all environment variables are set correctly
3. Ensure you have the necessary permissions in Supabase
4. Contact support if the issue persists

---

**Note:** This advanced progress tracking system is fully integrated with your existing booking system and provides a professional, efficient way to manage project progress for both providers and clients.
