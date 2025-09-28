# Backend-Driven Progress System

This document describes the backend-driven progress tracking system that provides real-time updates, transition validation, and audit logging for tasks and milestones.

## Overview

The backend-driven progress system replaces client-side progress calculations with server-side views and validation, ensuring data consistency and providing real-time updates across multiple clients.

## Architecture

### Database Layer

#### SQL Views
- **`v_milestone_progress`**: Calculates milestone progress from tasks with computed fields
- **`v_booking_progress`**: Calculates overall booking progress from milestones
- **`v_tasks_status`**: Provides task status with overdue calculations

#### Audit Logging
- **`audit_logs`**: Tracks all changes to tasks and milestones
- Triggers automatically log changes to status, title, due_date, and progress fields

#### Transition Validation
- **`can_transition()`**: Function to validate status transitions
- **`enforce_milestone_transition`**: Trigger to prevent invalid transitions

#### Progress Recalculation
- **`recalc_milestone_progress()`**: RPC function to recalculate milestone progress
- Automatically called when tasks are updated

### API Layer

#### Task Updates (`/api/tasks`)
- Validates status transitions using `can_transition()`
- Updates task in database
- Calls `recalc_milestone_progress()` to update milestone
- Broadcasts realtime update to `booking:{booking_id}` channel

### Frontend Layer

#### Backend Progress Service (`lib/backend-progress-service.ts`)
- Centralized service for all progress-related API calls
- Handles realtime subscriptions
- Provides transition validation

#### React Hook (`hooks/use-backend-progress.ts`)
- Custom hook for using backend progress system
- Manages realtime subscriptions
- Provides optimistic updates

#### Components
- **`BackendDrivenMilestones`**: Component using backend-driven progress
- Replaces direct database writes with API calls
- Shows realtime updates without refresh

## Features

### Transition Validation

The system enforces valid status transitions:

**Tasks:**
- `pending` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`, `on_hold`
- `completed` → `in_progress`, `cancelled`
- `cancelled` → `pending`, `in_progress`
- `on_hold` → `in_progress`, `cancelled`

**Milestones:**
- Same transition rules as tasks

### Realtime Updates

- Task updates broadcast to `booking:{booking_id}` channel
- Milestone progress updates automatically
- Booking progress updates automatically
- Multiple clients see changes without refresh

### Audit Logging

All changes to tasks and milestones are logged:
- Before/after values for tracked fields
- User who made the change
- Timestamp of change
- Changed field names

### Progress Calculation

- **Task Progress**: Based on sub-steps or manual percentage
- **Milestone Progress**: Average of task progress percentages
- **Booking Progress**: Weighted average of milestone progress

## Usage

### Basic Usage

```typescript
import { useBackendProgress } from '@/hooks/use-backend-progress'

function MyComponent({ bookingId }: { bookingId: string }) {
  const {
    milestones,
    tasks,
    updateTaskProgress,
    canTransition,
    loading,
    error
  } = useBackendProgress({ bookingId })

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await updateTaskProgress(taskId, updates)
    } catch (error) {
      // Handle error
    }
  }

  // Component JSX...
}
```

### Transition Validation

```typescript
const isValid = await canTransition('pending', 'completed', 'task')
if (!isValid) {
  // Show error message
  return
}

await updateTaskProgress(taskId, { status: 'completed' })
```

### Realtime Subscriptions

```typescript
const { milestones, tasks } = useBackendProgress({ 
  bookingId,
  autoRefresh: true // Enables realtime updates
})
```

## Testing

### Playwright Tests

The system includes comprehensive Playwright tests:

- **Transition Validation**: Tests forbidden and allowed transitions
- **Realtime Updates**: Tests that changes appear in multiple clients
- **Backend Views**: Tests that calculated fields are displayed correctly
- **Error Handling**: Tests API error scenarios

### Running Tests

```bash
# Run all progress system tests
npx playwright test tests/progress-system.spec.ts

# Run with specific browser
npx playwright test tests/progress-system.spec.ts --project=chromium

# Run with UI mode
npx playwright test tests/progress-system.spec.ts --ui
```

## Migration Guide

### From Client-Side Progress

1. Replace direct database writes with API calls
2. Use `useBackendProgress` hook instead of local state
3. Replace manual progress calculations with backend views
4. Add transition validation before status changes

### Example Migration

**Before:**
```typescript
// Direct database update
await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)

// Manual progress calculation
const progress = calculateProgress(tasks)
```

**After:**
```typescript
// API call with validation
await updateTaskProgress(taskId, { status: 'completed' })

// Backend-calculated progress
const { milestones } = useBackendProgress({ bookingId })
```

## Performance Considerations

### Database Views
- Views are materialized for better performance
- Indexes on frequently queried fields
- Efficient joins to minimize query time

### Realtime Updates
- Selective subscriptions to minimize overhead
- Channel-based updates to reduce noise
- Automatic cleanup of unused subscriptions

### Caching
- Local state caching for immediate updates
- Optimistic updates for better UX
- Background refresh for data consistency

## Troubleshooting

### Common Issues

1. **Transition Validation Errors**
   - Check if transition is allowed in `can_transition()`
   - Verify current status before attempting change

2. **Realtime Updates Not Working**
   - Check if Supabase realtime is enabled
   - Verify channel subscriptions are active
   - Check network connectivity

3. **Progress Not Updating**
   - Verify `recalc_milestone_progress()` is being called
   - Check if triggers are enabled
   - Verify view calculations are correct

### Debug Mode

Enable debug logging:

```typescript
// In backend-progress-service.ts
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('Progress update:', update)
}
```

## Future Enhancements

- [ ] Bulk task updates
- [ ] Progress templates
- [ ] Advanced reporting
- [ ] Mobile app support
- [ ] Offline synchronization
