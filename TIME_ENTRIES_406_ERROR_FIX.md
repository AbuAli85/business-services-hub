# Fix 406 Error for time_entries Table

## Problem
The `time_entries` table is being queried incorrectly, causing a 406 error. The issue is that the frontend is trying to query `time_entries` directly with `booking_id`, but this column doesn't exist in the `time_entries` table.

## Root Cause
The `time_entries` table structure is:
```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),  -- Links to tasks, not bookings
    user_id UUID NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**The relationship chain is:**
`bookings` → `milestones` → `tasks` → `time_entries`

## ❌ Wrong Way (Causes 406 Error)
```typescript
// This will fail because time_entries doesn't have booking_id
const { data, error } = await supabase
  .from('time_entries')
  .select('id, booking_id, duration, created_at')  // ❌ booking_id doesn't exist!
  .eq('booking_id', bookingId)  // ❌ This will fail!
  .headers({ Accept: 'application/json' });
```

## ✅ Correct Ways

### Method 1: Use the Service Method (Recommended)
```typescript
import { ProgressTrackingService } from '@/lib/progress-tracking'

// This handles the relationship chain automatically
const timeEntries = await ProgressTrackingService.getTimeEntriesByBookingId(bookingId)
```

### Method 2: Direct Query with Relationship Chain
```typescript
const supabase = await getSupabaseClient()

// First, get all task IDs for this booking through milestones
const { data: milestones } = await supabase
  .from('milestones')
  .select(`
    id,
    tasks(
      id
    )
  `)
  .eq('booking_id', bookingId)

const taskIds = milestones?.flatMap(m => m.tasks?.map(t => t.id) || []) || []

if (taskIds.length === 0) return []

// Then get time entries for those tasks
const { data, error } = await supabase
  .from('time_entries')
  .select('id, task_id, duration_minutes, created_at')
  .in('task_id', taskIds)
  .order('created_at', { ascending: false })
```

### Method 3: Single Query with Joins (Advanced)
```typescript
const { data, error } = await supabase
  .from('time_entries')
  .select(`
    id,
    task_id,
    user_id,
    description,
    start_time,
    end_time,
    duration_minutes,
    is_active,
    created_at,
    updated_at,
    tasks!inner(
      id,
      milestone_id,
      milestones!inner(
        id,
        booking_id
      )
    )
  `)
  .eq('tasks.milestones.booking_id', bookingId)
  .order('created_at', { ascending: false })
```

## Implementation

### 1. Updated Service Method
Added `getTimeEntriesByBookingId()` method to `lib/progress-tracking.ts`:

```typescript
static async getTimeEntriesByBookingId(bookingId: string): Promise<TimeEntry[]> {
  try {
    // First, get all task IDs for this booking through milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id,
        tasks(
          id
        )
      `)
      .eq('booking_id', bookingId)
    
    if (milestonesError) throw milestonesError
    
    // Extract all task IDs
    const taskIds = milestones?.flatMap(milestone => 
      milestone.tasks?.map((task: any) => task.id) || []
    ) || []
    
    if (taskIds.length === 0) {
      return []
    }
    
    // Now get time entries for these tasks
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        task_id,
        user_id,
        description,
        start_time,
        end_time,
        duration_minutes,
        is_active,
        created_at,
        updated_at
      `)
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
    
    if (timeEntriesError) throw timeEntriesError
    return timeEntries || []
    
  } catch (error) {
    console.error('Error fetching time entries by booking ID:', error)
    return []
  }
}
```

### 2. API Endpoint
Created `/api/time-entries/[bookingId]` endpoint that demonstrates the correct approach.

### 3. Example Component
Created `components/dashboard/time-entries-example.tsx` showing both wrong and correct approaches.

## Usage in Frontend

Replace any direct queries to `time_entries` with `booking_id`:

```typescript
// ❌ Replace this:
const { data, error } = await supabase
  .from('time_entries')
  .select('id, booking_id, duration, created_at')
  .eq('booking_id', bookingId)

// ✅ With this:
const timeEntries = await ProgressTrackingService.getTimeEntriesByBookingId(bookingId)
```

## Testing

1. Use the example component to test the correct approach
2. Check the API endpoint at `/api/time-entries/[bookingId]`
3. Verify no 406 errors in the console

## Summary

The 406 error occurs because `time_entries` doesn't have a direct `booking_id` column. The correct approach is to:

1. **Use the service method** `ProgressTrackingService.getTimeEntriesByBookingId(bookingId)`
2. **Follow the relationship chain**: `bookings` → `milestones` → `tasks` → `time_entries`
3. **Query by task IDs** instead of booking ID directly

This fix ensures proper data retrieval without 406 errors.
