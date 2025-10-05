# 🚀 Progress System Deployment Guide

## 📋 **Overview**

This guide provides step-by-step instructions for deploying the improved milestones and tasks progress system to your production environment.

## 🔧 **Prerequisites**

- Supabase project with database access
- Node.js 18+ installed
- Access to your production environment
- Backup of current database (recommended)

## 📦 **Deployment Steps**

### **Step 1: Database Migration**

1. **Apply the critical fixes migration:**
   ```bash
   # Navigate to your project directory
   cd /path/to/your/project
   
   # Apply the migration
   npx supabase db push
   ```

2. **Verify migration success:**
   ```sql
   -- Check if functions exist
   SELECT proname FROM pg_proc WHERE proname IN (
     'calculate_booking_progress',
     'update_milestone_progress',
     'update_task'
   );
   
   -- Check materialized view
   SELECT * FROM mv_booking_progress_analytics LIMIT 1;
   ```

### **Step 2: Deploy API Endpoints**

1. **Deploy the new progress API:**
   ```bash
   # The new API endpoint will be available at:
   # POST /api/progress/calculate
   # GET /api/progress/calculate?booking_id=<id>
   ```

2. **Test the API endpoints:**
   ```bash
   # Test progress calculation
   curl -X POST http://your-domain.com/api/progress/calculate \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "your-booking-id"}'
   
   # Test progress analytics
   curl "http://your-domain.com/api/progress/calculate?booking_id=your-booking-id"
   ```

### **Step 3: Deploy Frontend Components**

1. **Update your existing milestone components:**
   ```bash
   # Replace or update your milestone components with the improved versions
   # - components/dashboard/improved-milestone-system.tsx
   # - components/dashboard/progress-analytics.tsx
   ```

2. **Update your booking details page:**
   ```typescript
   // Add the new components to your booking details page
   import { ImprovedMilestoneSystem } from '@/components/dashboard/improved-milestone-system'
   import { ProgressAnalytics } from '@/components/dashboard/progress-analytics'
   
   // Use in your component
   <ImprovedMilestoneSystem 
     bookingId={bookingId} 
     userRole={userRole} 
   />
   <ProgressAnalytics bookingId={bookingId} />
   ```

### **Step 4: Update Progress Service**

1. **Deploy the new progress service:**
   ```bash
   # The new service will be available at:
   # lib/progress-service.ts
   ```

2. **Update your existing code to use the new service:**
   ```typescript
   import { progressService } from '@/lib/progress-service'
   
   // Example usage
   const result = await progressService.updateProgress({
     booking_id: bookingId,
     milestone_id: milestoneId,
     task_id: taskId
   })
   ```

### **Step 5: Testing**

1. **Run the progress system test:**
   ```bash
   # Install dependencies if needed
   npm install @supabase/supabase-js dotenv
   
   # Run the test script
   node scripts/test-progress-system.js
   ```

2. **Manual testing checklist:**
   - [ ] Create a new booking
   - [ ] Add milestones to the booking
   - [ ] Add tasks to milestones
   - [ ] Update task status and verify progress calculation
   - [ ] Verify milestone progress updates
   - [ ] Verify booking progress updates
   - [ ] Test progress analytics dashboard
   - [ ] Test real-time updates
   - [ ] Test error handling

### **Step 6: Performance Optimization**

1. **Enable database indexes:**
   ```sql
   -- Verify indexes are created
   SELECT indexname, tablename FROM pg_indexes 
   WHERE tablename IN ('milestones', 'tasks', 'bookings')
   AND indexname LIKE '%progress%';
   ```

2. **Configure caching:**
   ```typescript
   // The progress service includes built-in caching
   // Cache duration: 5 minutes
   // Auto-clear on updates
   ```

3. **Monitor performance:**
   ```bash
   # Check API response times
   # Monitor database query performance
   # Watch for memory usage
   ```

## 🔍 **Verification**

### **Database Verification**

```sql
-- Check function permissions
SELECT 
  p.proname as function_name,
  r.rolname as role_name,
  p.proacl as permissions
FROM pg_proc p
LEFT JOIN pg_roles r ON r.oid = ANY(p.proacl)
WHERE p.proname IN (
  'calculate_booking_progress',
  'update_milestone_progress',
  'update_task'
);

-- Check materialized view
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews 
WHERE matviewname = 'mv_booking_progress_analytics';

-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('milestones', 'tasks', 'bookings')
AND indexname LIKE '%progress%';
```

### **API Verification**

```bash
# Test progress calculation
curl -X POST https://your-domain.com/api/progress/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"booking_id": "test-booking-id"}'

# Test progress analytics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/progress/calculate?booking_id=test-booking-id"
```

### **Frontend Verification**

1. **Check component rendering:**
   - Milestone system loads without errors
   - Progress bars display correctly
   - Analytics dashboard shows data
   - Real-time updates work

2. **Check functionality:**
   - Task status updates work
   - Milestone progress updates work
   - Booking progress updates work
   - Error handling works

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Function not found errors:**
   ```sql
   -- Re-run the migration
   npx supabase db push
   
   -- Or manually create functions
   \i supabase/migrations/211_critical_progress_system_fixes.sql
   ```

2. **Permission errors:**
   ```sql
   -- Grant permissions manually
   GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
   GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
   GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO authenticated;
   ```

3. **Materialized view errors:**
   ```sql
   -- Refresh materialized view
   REFRESH MATERIALIZED VIEW mv_booking_progress_analytics;
   
   -- Or recreate it
   DROP MATERIALIZED VIEW IF EXISTS mv_booking_progress_analytics;
   \i supabase/migrations/211_critical_progress_system_fixes.sql
   ```

4. **API errors:**
   - Check environment variables
   - Verify Supabase connection
   - Check function permissions
   - Review error logs

### **Performance Issues**

1. **Slow progress calculations:**
   ```sql
   -- Check if indexes exist
   SELECT indexname FROM pg_indexes WHERE tablename = 'milestones';
   
   -- Create missing indexes
   CREATE INDEX IF NOT EXISTS idx_milestones_booking_id_progress 
   ON milestones(booking_id, progress_percentage);
   ```

2. **Memory issues:**
   ```sql
   -- Check materialized view size
   SELECT pg_size_pretty(pg_total_relation_size('mv_booking_progress_analytics'));
   
   -- Refresh if needed
   REFRESH MATERIALIZED VIEW mv_booking_progress_analytics;
   ```

## 📊 **Monitoring**

### **Key Metrics to Monitor**

1. **API Performance:**
   - Response times for progress calculations
   - Error rates
   - Request volume

2. **Database Performance:**
   - Query execution times
   - Index usage
   - Materialized view refresh times

3. **User Experience:**
   - Page load times
   - Progress update frequency
   - Error rates

### **Monitoring Setup**

```typescript
// Add monitoring to your progress service
import { progressService } from '@/lib/progress-service'

// Monitor progress updates
const startTime = Date.now()
const result = await progressService.updateProgress(update)
const duration = Date.now() - startTime

// Log performance metrics
console.log(`Progress update took ${duration}ms`)
```

## 🔄 **Rollback Plan**

If issues arise, you can rollback by:

1. **Revert database changes:**
   ```sql
   -- Drop new functions
   DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
   DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
   DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz, integer, numeric, text);
   
   -- Drop materialized view
   DROP MATERIALIZED VIEW IF EXISTS mv_booking_progress_analytics;
   
   -- Drop indexes
   DROP INDEX IF EXISTS idx_milestones_booking_id_progress;
   DROP INDEX IF EXISTS idx_tasks_milestone_id_status;
   DROP INDEX IF EXISTS idx_tasks_milestone_id_progress;
   DROP INDEX IF EXISTS idx_bookings_progress_updated;
   ```

2. **Revert frontend changes:**
   ```bash
   # Restore previous components
   git checkout HEAD~1 -- components/dashboard/
   git checkout HEAD~1 -- lib/progress-service.ts
   ```

3. **Revert API changes:**
   ```bash
   # Remove new API endpoint
   rm app/api/progress/calculate/route.ts
   ```

## 📈 **Post-Deployment**

### **Immediate Actions**

1. **Monitor system performance**
2. **Check error logs**
3. **Verify user functionality**
4. **Test critical workflows**

### **Follow-up Actions**

1. **Gather user feedback**
2. **Monitor performance metrics**
3. **Optimize based on usage patterns**
4. **Plan additional improvements**

## 🎯 **Success Criteria**

The deployment is successful when:

- [ ] All tests pass (80%+ success rate)
- [ ] Progress calculations are accurate
- [ ] Real-time updates work
- [ ] Performance is acceptable (<2s response times)
- [ ] No critical errors in logs
- [ ] User feedback is positive

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review error logs
3. Run the test script to identify issues
4. Contact support with specific error messages

---

**Note:** This deployment guide assumes you have a working Supabase setup and Next.js application. Adjust paths and commands as needed for your specific environment.
