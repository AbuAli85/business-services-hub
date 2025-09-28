# Testing Database Functions

## Overview
This guide explains how to properly test the database functions without encountering UUID format errors.

## Common Error
```
ERROR: 22P02: invalid input syntax for type uuid: "milestone-id"
```
This error occurs when using placeholder strings instead of valid UUIDs.

## Valid UUID Format
UUIDs must follow this format: `550e8400-e29b-41d4-a716-446655440000`

## Testing Methods

### 1. Using the Test Script
Run the provided test script in Supabase SQL editor:
```sql
-- Run this file
\i scripts/test-functions-with-valid-uuids.sql
```

### 2. Manual Testing with Real Data

#### Step 1: Find Valid UUIDs
```sql
-- Get a real booking ID
SELECT id FROM bookings LIMIT 1;

-- Get a real milestone ID
SELECT id FROM milestones LIMIT 1;

-- Get a real task ID
SELECT id FROM tasks LIMIT 1;
```

#### Step 2: Test Functions with Real UUIDs
```sql
-- Test calculate_booking_progress (replace with real booking ID)
SELECT calculate_booking_progress('550e8400-e29b-41d4-a716-446655440000');

-- Test update_milestone_progress (replace with real milestone ID)
SELECT update_milestone_progress('550e8400-e29b-41d4-a716-446655440000');

-- Test update_task (replace with real task ID)
SELECT update_task('550e8400-e29b-41d4-a716-446655440000', 'Updated Title', 'completed');
```

### 3. Using the API Test Endpoint
```bash
# Test via API (no UUID needed)
curl https://your-domain.com/api/test-db-functions
```

### 4. Creating Test Data
If no data exists, create test data first:

```sql
-- Create a test booking
INSERT INTO bookings (client_id, provider_id, service_id, status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  'pending'
) RETURNING id;

-- Create a test milestone
INSERT INTO milestones (booking_id, title, description)
VALUES (
  'your-booking-id-here',
  'Test Milestone',
  'Test milestone description'
) RETURNING id;

-- Create a test task
INSERT INTO tasks (milestone_id, title, description)
VALUES (
  'your-milestone-id-here',
  'Test Task',
  'Test task description'
) RETURNING id;
```

## Function Reference

### calculate_booking_progress(booking_id uuid)
- **Purpose**: Calculates weighted progress across all milestones for a booking
- **Returns**: INTEGER (0-100)
- **Example**: `SELECT calculate_booking_progress('your-booking-id');`

### update_milestone_progress(milestone_uuid uuid)
- **Purpose**: Updates milestone progress based on task completion
- **Returns**: VOID
- **Example**: `SELECT update_milestone_progress('your-milestone-id');`

### update_task(task_id uuid, title text, status text, due_date timestamptz, progress_percentage integer)
- **Purpose**: Updates a task and triggers progress updates
- **Returns**: VOID
- **Example**: `SELECT update_task('your-task-id', 'New Title', 'completed');`

## Troubleshooting

### Error: "relation does not exist"
- Ensure tables are created first
- Run migration 159 to create tables

### Error: "function does not exist"
- Ensure functions are created
- Run migration 157 or 158 to create functions

### Error: "invalid input syntax for type uuid"
- Use valid UUID format
- Get real UUIDs from existing data
- Don't use placeholder strings like "milestone-id"

## Best Practices

1. **Always use real UUIDs** from existing data
2. **Test with small datasets** first
3. **Use the provided test script** for comprehensive testing
4. **Check function existence** before testing
5. **Verify table structure** before running functions

## Sample Test Sequence

```sql
-- 1. Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%progress%';

-- 2. Get real data
SELECT id, status FROM bookings LIMIT 1;
SELECT id, title FROM milestones LIMIT 1;
SELECT id, title FROM tasks LIMIT 1;

-- 3. Test functions with real UUIDs
SELECT calculate_booking_progress('real-booking-id');
SELECT update_milestone_progress('real-milestone-id');
SELECT update_task('real-task-id', 'Test', 'completed');
```
