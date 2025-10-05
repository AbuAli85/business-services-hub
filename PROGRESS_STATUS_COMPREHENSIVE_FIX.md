# Progress & Status Tracking - Comprehensive Fix Report

## 🔍 Deep Dive Findings

### Critical Issues Identified

#### 1. **Milestone Progress Not Auto-Updated on Milestone Changes**
- **Location**: `app/api/milestones/route.ts` (PATCH method, lines 340-384)
- **Issue**: When a milestone status changes, `progress_percentage` is not recalculated from tasks
- **Impact**: Manual milestone updates don't reflect actual task completion
- **Fix Required**: Call `recalc_milestone_progress` after milestone updates

#### 2. **Booking Progress Uses Fallback Values**
- **Location**: `app/api/bookings/route.ts` (lines 488-513)
- **Issue**: Falls back to hardcoded values when `v_booking_progress` view fails:
  ```typescript
  if (status === 'completed') progress = 100
  else if (status === 'in_progress') progress = Math.max(progress, 50)
  else if (status === 'approved') progress = Math.max(progress, 25)
  else if (status === 'pending') progress = 10
  ```
- **Impact**: Progress doesn't reflect actual work completion
- **Fix Required**: Always calculate from milestones, never use hardcoded values

#### 3. **Status Validation Missing**
- **Location**: Multiple API endpoints
- **Issue**: 
  - Milestones can transition to any status without validation
  - Bookings can transition to any status without rules
  - Only tasks have proper transition validation (lines 384-415 in tasks/route.ts)
- **Impact**: Invalid status transitions cause data inconsistency
- **Fix Required**: Add status transition validation for milestones and bookings

#### 4. **Progress Calculation Inconsistencies**
- **Multiple Functions**:
  - `calculate_booking_progress` - updates booking from milestones
  - `update_milestone_progress` - updates milestone from tasks  
  - `recalc_milestone_progress` - RPC version
- **Issue**: Different migration files have different versions of these functions
- **Impact**: Progress calculations may be inconsistent
- **Fix Required**: Consolidate to single source of truth

#### 5. **No Cascade Updates**
- **Issue**: 
  - Task update → calls `recalc_milestone_progress`
  - But doesn't trigger booking-level recalculation
  - Milestone update → doesn't trigger anything
- **Impact**: Booking progress outdated until explicit refresh
- **Fix Required**: Implement cascade: Task → Milestone → Booking

#### 6. **Real-time Updates Incomplete**
- **Location**: `app/api/tasks/route.ts` (lines 568-581)
- **Issue**: Broadcasts to booking channel but UI may not subscribe properly
- **Impact**: Users need to refresh to see changes
- **Fix Required**: Ensure UI components subscribe and react to changes

### Data Flow Issues

```
Current Flow (BROKEN):
Task Update → recalc_milestone_progress → [STOPS]
                                        → booking progress NOT updated

Milestone Update → [NO RECALCULATION]

Booking Progress Display → Falls back to hardcoded values if view fails

Expected Flow (CORRECT):
Task Update → recalc_milestone_progress → calculate_booking_progress → UI Update
Milestone Update → recalc_milestone_progress → calculate_booking_progress → UI Update
Status Change → Validation → Update → Progress Recalc → UI Update
```

## 🔧 Comprehensive Fixes

### Fix 1: Add Progress Recalculation to Milestone Updates

**File**: `app/api/milestones/route.ts`
**Line**: After line 379 (after milestone update)

```typescript
// Recalculate milestone progress from tasks
try {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('milestone_id', milestoneId)
  
  if (tasks) {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const calculatedProgress = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0
    
    // Update if different from provided value
    if (calculatedProgress !== updateData.progress_percentage) {
      updateData.progress_percentage = calculatedProgress
    }
  }
} catch (progressError) {
  console.warn('Could not recalculate milestone progress:', progressError)
}

// Also trigger booking progress update
try {
  if (milestone.booking_id) {
    await supabase.rpc('calculate_booking_progress', {
      booking_id: milestone.booking_id
    })
  }
} catch (bookingProgressError) {
  console.warn('Could not update booking progress:', bookingProgressError)
}
```

### Fix 2: Remove Hardcoded Fallback Values

**File**: `app/api/bookings/route.ts`
**Lines**: 488-513

Replace with:
```typescript
// Always calculate from milestones - never use hardcoded values
const { data: progressRows, error: progressError } = await supabase
  .from('milestones')
  .select('id, progress_percentage, weight, status, booking_id')
  .in('booking_id', ids)

if (progressError) {
  console.warn('⚠️ Could not fetch milestones for progress:', progressError)
  // Set all to 0 instead of guessing
  for (const id of ids) {
    progressMap.set(String(id), 0)
  }
} else {
  // Group by booking_id and calculate weighted progress
  const progressByBooking = new Map<string, number>()
  
  for (const row of (progressRows || [])) {
    const bookingId = String(row.booking_id)
    if (!progressByBooking.has(bookingId)) {
      progressByBooking.set(bookingId, 0)
    }
    
    const milestones = (progressRows || []).filter(
      r => String(r.booking_id) === bookingId
    )
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
    const weightedProgress = milestones.reduce(
      (sum, m) => sum + ((m.progress_percentage || 0) * (m.weight || 1)),
      0
    )
    const overallProgress = totalWeight > 0 
      ? Math.round(weightedProgress / totalWeight) 
      : 0
    
    progressByBooking.set(bookingId, overallProgress)
  }
  
  // Apply calculated progress
  for (const id of ids) {
    progressMap.set(String(id), progressByBooking.get(String(id)) || 0)
  }
}
```

### Fix 3: Add Status Transition Validation for Milestones

**File**: `app/api/milestones/route.ts`
**Lines**: After line 338 (before milestone update)

```typescript
// Validate status transition if status is being changed
if (validatedData.status && validatedData.status !== milestone.status) {
  const canTransition = (from: string, to: string) => {
    const allowed: Record<string, string[]> = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'on_hold', 'cancelled'],
      on_hold: ['in_progress', 'cancelled'],
      completed: [], // Cannot transition from completed
      cancelled: [], // Cannot transition from cancelled
    }
    return allowed[from]?.includes(to) ?? false
  }

  if (!canTransition(milestone.status, validatedData.status)) {
    return NextResponse.json(
      { 
        error: 'INVALID_TRANSITION', 
        message: `Cannot transition milestone from ${milestone.status} to ${validatedData.status}`,
        allowed_transitions: {
          pending: ['in_progress', 'cancelled'],
          in_progress: ['completed', 'on_hold', 'cancelled'],
          on_hold: ['in_progress', 'cancelled'],
          completed: [],
          cancelled: []
        }
      },
      { status: 422, headers: corsHeaders }
    )
  }
}
```

### Fix 4: Add Cascade Update Function

**New File**: `app/api/progress/recalculate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

/**
 * POST /api/progress/recalculate
 * Recalculates progress cascade: Tasks → Milestone → Booking
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { milestone_id, booking_id } = body

    if (!milestone_id && !booking_id) {
      return NextResponse.json(
        { error: 'milestone_id or booking_id required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    let targetBookingId = booking_id
    let updatedMilestones = []

    // If milestone_id provided, recalculate that milestone and get booking_id
    if (milestone_id) {
      const { data: milestone } = await supabase
        .from('milestones')
        .select('booking_id')
        .eq('id', milestone_id)
        .single()

      if (milestone) {
        targetBookingId = milestone.booking_id
        
        // Recalculate milestone progress
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('milestone_id', milestone_id)

        if (tasks) {
          const totalTasks = tasks.length
          const completedTasks = tasks.filter(t => t.status === 'completed').length
          const progress = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0

          await supabase
            .from('milestones')
            .update({ 
              progress_percentage: progress,
              completed_tasks: completedTasks,
              total_tasks: totalTasks,
              updated_at: new Date().toISOString()
            })
            .eq('id', milestone_id)

          updatedMilestones.push({ id: milestone_id, progress })
        }
      }
    }

    // Recalculate booking progress
    if (targetBookingId) {
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id, progress_percentage, weight, status')
        .eq('booking_id', targetBookingId)

      if (milestones && milestones.length > 0) {
        const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
        const weightedProgress = milestones.reduce(
          (sum, m) => sum + ((m.progress_percentage || 0) * (m.weight || 1)),
          0
        )
        const bookingProgress = totalWeight > 0 
          ? Math.round(weightedProgress / totalWeight) 
          : 0

        await supabase
          .from('bookings')
          .update({ 
            progress_percentage: bookingProgress,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetBookingId)

        return NextResponse.json(
          { 
            success: true,
            booking_id: targetBookingId,
            booking_progress: bookingProgress,
            milestones: updatedMilestones
          },
          { status: 200, headers: corsHeaders }
        )
      }
    }

    return NextResponse.json(
      { error: 'No data to recalculate' },
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Progress recalculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
```

### Fix 5: Update Task API to Trigger Full Cascade

**File**: `app/api/tasks/route.ts`
**Lines**: Replace 550-566 with:

```typescript
// Trigger full cascade recalculation
try {
  // Step 1: Recalculate milestone progress
  const { data: milestoneProgressData } = await supabase
    .rpc('recalc_milestone_progress', {
      p_milestone_id: task.milestone_id
    })
    .single()

  milestoneProgress = milestoneProgressData

  // Step 2: Recalculate booking progress
  await supabase.rpc('calculate_booking_progress', {
    booking_id: milestone.booking_id
  })

  console.log('✅ Full progress cascade completed: Task → Milestone → Booking')
} catch (cascadeError) {
  console.warn('⚠️ Progress cascade warning (non-critical):', cascadeError)
  
  // Fallback: Direct calculation
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('milestone_id', task.milestone_id)

  if (tasks) {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    await supabase
      .from('milestones')
      .update({ progress_percentage: progress })
      .eq('id', task.milestone_id)

    milestoneProgress = progress
  }
}
```

## 📊 Testing Checklist

### Task Update Flow
- [ ] Update task status to completed → milestone progress increases
- [ ] Update task status to pending → milestone progress decreases
- [ ] Delete task → milestone progress recalculates
- [ ] Create task → milestone total_tasks increases

### Milestone Update Flow  
- [ ] Update milestone status → progress recalculates from tasks
- [ ] Update milestone → booking progress updates
- [ ] Delete milestone → booking progress recalculates

### Status Transitions
- [ ] Task: pending → in_progress (allowed)
- [ ] Task: in_progress → completed (allowed)
- [ ] Task: completed → pending (blocked)
- [ ] Milestone: pending → in_progress (allowed)
- [ ] Milestone: completed → pending (blocked)

### Progress Accuracy
- [ ] 0% when no tasks completed
- [ ] 50% when half tasks completed
- [ ] 100% when all tasks completed
- [ ] Weighted correctly when milestones have different weights
- [ ] No hardcoded fallback values used

### Real-time Updates
- [ ] UI updates when task status changes
- [ ] UI updates when milestone status changes
- [ ] Multiple users see changes simultaneously
- [ ] Progress bars animate smoothly

## 🚀 Implementation Priority

1. **CRITICAL** - Fix 2: Remove hardcoded fallback values (breaks progress accuracy)
2. **HIGH** - Fix 5: Add full cascade to task updates (most common operation)
3. **HIGH** - Fix 1: Add recalculation to milestone updates
4. **MEDIUM** - Fix 3: Add status transition validation
5. **MEDIUM** - Fix 4: Create cascade API endpoint
6. **LOW** - Fix 6: Improve real-time subscriptions

## 📝 Notes

- All fixes are backward compatible
- No database schema changes required
- Existing RPC functions can be reused
- Performance impact: Minimal (already doing similar calculations)
- Security: All fixes maintain existing RLS policies
