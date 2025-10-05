## Booking Progress Column Fix

## Issue Identified

The main **Bookings page** shows a **Progress column** (line 770-773 in `app/dashboard/bookings/page.tsx`):
```typescript
{ key: 'progress', header: 'Progress', widthClass: 'w-24', render: (r:any) => {
  const pct = Math.max(0, Math.min(100, Number(r.progress_percentage ?? r.progress?.percentage ?? 0)))
  return `${pct}%`
} }
```

**Problem**: Progress wasn't updating when milestones and tasks were modified because:

1. **Old Trigger Logic**: The database trigger was calculating based on **completed milestone count** instead of **weighted milestone progress**
2. **No Task-Level Triggers**: Tasks updating didn't trigger milestone recalculation
3. **Missing Field Sync**: `progress_percentage` and `project_progress` fields weren't synced

## Solution Applied

### 1. **Updated Booking Progress Trigger** ✅

**BEFORE:**
```sql
-- Calculated based on completed milestones only
new_progress := (completed_milestones / total_milestones) * 100
-- Result: Only 100% when ALL milestones complete
```

**AFTER:**
```sql
-- Calculates weighted progress from milestone percentages
FOR milestone_record IN
  SELECT progress_percentage, weight
  FROM milestones
  WHERE booking_id = booking_uuid
LOOP
  weighted_progress := weighted_progress + (progress * weight)
  total_weight := total_weight + weight
END LOOP

final_progress := ROUND(weighted_progress / total_weight)
```

**Benefits:**
- ✅ Shows incremental progress (0-100%)
- ✅ Each milestone contributes to overall progress
- ✅ Weighted by milestone importance
- ✅ Updates in real-time

### 2. **Added Task-Level Trigger** ✅

**NEW:**
```sql
CREATE TRIGGER trg_update_milestone_progress_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_milestone_progress_on_task_change()
```

**What it does:**
1. When task status changes → recalculates milestone progress
2. When milestone progress changes → triggers booking progress update
3. **Cascade**: Task → Milestone → Booking

**Benefits:**
- ✅ Task completion updates milestone %
- ✅ Milestone % updates booking %
- ✅ Automatic status transitions
- ✅ Real-time UI updates

### 3. **Auto-Status Updates** ✅

**Milestone Status:**
```sql
IF progress = 100 THEN 
  status := 'completed'
ELSIF progress > 0 AND status = 'pending' THEN
  status := 'in_progress'
ELSIF progress = 0 AND status = 'in_progress' THEN
  status := 'pending'
END IF
```

**Booking Status:**
```sql
UPDATE bookings SET
  status = CASE
    WHEN progress = 100 THEN 'completed'
    WHEN progress > 0 THEN 'in_progress'
    ELSE status
  END
```

### 4. **Field Synchronization** ✅

```sql
UPDATE bookings
SET progress_percentage = COALESCE(project_progress, 0)
WHERE progress_percentage IS NULL 
   OR progress_percentage != COALESCE(project_progress, 0)
```

**Benefits:**
- ✅ Both `progress_percentage` and `project_progress` stay in sync
- ✅ Works with old and new code
- ✅ Backward compatible

### 5. **Force Recalculation** ✅

```sql
-- Recalculate all existing bookings
FOR booking_rec IN SELECT DISTINCT booking_id FROM milestones LOOP
  PERFORM calculate_booking_progress(booking_rec.booking_id)
END LOOP
```

**Benefits:**
- ✅ Fixes any existing data
- ✅ Ensures all bookings have correct progress
- ✅ One-time sync operation

## How It Works

### Complete Flow:

```
User completes a task
    ↓
Task updated in database
    ↓
TRIGGER: update_milestone_progress_on_task_change()
    ↓
Milestone progress recalculated (e.g., 3/10 tasks = 30%)
    ↓
Milestone updated in database
    ↓
TRIGGER: update_booking_progress_on_milestone_change()
    ↓
Booking progress recalculated (weighted average)
    ↓
Booking updated in database
    ↓
Bookings page automatically refreshes (realtime)
    ↓
Progress column shows updated percentage ✅
```

### Example Calculation:

**Booking has 3 milestones:**
- Milestone A: 60% complete, weight: 1
- Milestone B: 40% complete, weight: 1
- Milestone C: 100% complete, weight: 1

**Calculation:**
```
weighted_progress = (60×1) + (40×1) + (100×1) = 200
total_weight = 1 + 1 + 1 = 3
booking_progress = ROUND(200 / 3) = 67%
```

**Result on bookings page:** Shows "67%" in Progress column

## Bookings Page Display

### Before Fix:
```
Service          Client    Provider   Status       Progress
Content Creation Fahad     fahad      In Progress  0%  ❌
```

### After Fix:
```
Service          Client    Provider   Status       Progress
Content Creation Fahad     fahad      In Progress  67% ✅
```

## Realtime Updates

The `useBookingsFullData` hook (lines 172-233) subscribes to changes on:
1. ✅ `bookings` table (line 188)
2. ✅ `milestones` table (line 200)
3. ✅ `invoices` table (line 212)

When triggers update the bookings table, the realtime subscription automatically refreshes the data!

## View Integration

The data source `v_booking_status` view is queried at line 101:
```typescript
let query = supabase
  .from('v_booking_status')
  .select('*', { count: 'exact' })
```

This view should include `progress` field which maps to `bookings.progress_percentage`.

## Migration Instructions

### Run the SQL file:

```bash
# Option 1: Run in Supabase SQL Editor
Copy contents of fix_booking_progress_display.sql and run in Supabase dashboard

# Option 2: Apply via migration
supabase migration create fix_booking_progress_display
# Copy contents to new migration file
supabase db push
```

### After Running:

1. **Triggers installed** → Progress auto-updates
2. **Existing data synced** → All bookings have correct progress
3. **Realtime enabled** → UI updates automatically
4. **Indexes added** → Fast queries

## Testing

### Test 1: Create Task
```
1. Go to booking milestones page
2. Add a task to a milestone
3. Go back to main bookings page
4. Progress column should show >0%
```

### Test 2: Complete Task
```
1. Mark a task as completed
2. Go back to main bookings page
3. Progress should increase
4. If all tasks complete → shows 100%
```

### Test 3: Multiple Milestones
```
1. Create 3 milestones
2. Complete tasks in milestone 1 (33% of booking)
3. Bookings page should show ~33%
4. Complete tasks in milestone 2
5. Should show ~67%
6. Complete all tasks
7. Should show 100%
```

### Test 4: Realtime Updates
```
1. Open bookings page
2. Open milestone page in another tab
3. Complete a task in milestone page
4. Bookings page should auto-update (no manual refresh)
```

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check booking progress values
SELECT 
  id,
  title,
  status,
  progress_percentage,
  project_progress,
  updated_at
FROM bookings
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Check milestone progress
SELECT 
  id,
  title,
  booking_id,
  status,
  progress_percentage,
  weight,
  total_tasks,
  completed_tasks
FROM milestones
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Check task counts
SELECT 
  m.title as milestone,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks
FROM milestones m
LEFT JOIN tasks t ON t.milestone_id = m.id
WHERE m.booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
GROUP BY m.id, m.title;
```

## Expected Results

After running the migration:

### Bookings Table Column
```
Progress
--------
0%      (no milestones)
25%     (1/4 milestones complete)
50%     (2/4 milestones complete)
67%     (weighted average)
100%    (all complete)
```

### Status Column
```
Status
----------
Pending       (0% progress)
In Progress   (1-99% progress)
Completed     (100% progress)
```

## Summary

**This fix ensures:**
1. ✅ Progress column shows accurate real-time data
2. ✅ Updates automatically when tasks/milestones change
3. ✅ Uses weighted calculation for accuracy
4. ✅ Status auto-updates based on progress
5. ✅ Realtime subscriptions work properly
6. ✅ No manual refresh needed
7. ✅ Both `progress_percentage` and `project_progress` fields synced

**Run the SQL file to enable automatic progress updates on the main bookings page!** 📊✨
