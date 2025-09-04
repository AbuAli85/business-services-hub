-- Step 4: Create booking_progress_view
-- Run this fourth in Supabase Dashboard > SQL Editor

-- Create view for comprehensive progress data
CREATE OR REPLACE VIEW booking_progress_view AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    COALESCE(b.status, 'pending') as booking_status,
    COALESCE(b.progress_percentage, 0) as booking_progress,
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT CASE WHEN COALESCE(m.status, 'pending') = 'completed' THEN m.id END) as completed_milestones,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN COALESCE(t.status, 'pending') = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN COALESCE(t.is_overdue, FALSE) = TRUE THEN t.id END) as overdue_tasks,
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    b.created_at,
    b.updated_at
FROM public.bookings b
LEFT JOIN public.milestones m ON m.booking_id = b.id
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY b.id, b.title, b.status, b.progress_percentage, b.created_at, b.updated_at;

-- Grant permissions
GRANT SELECT ON booking_progress_view TO authenticated;

-- Add comments
COMMENT ON TABLE public.tasks IS 'Individual tasks within milestones for detailed progress tracking';
COMMENT ON TABLE public.time_entries IS 'Time tracking entries for tasks with start/stop functionality';
COMMENT ON TABLE public.task_comments IS 'Comments and discussions on tasks (internal and shared)';

SELECT 'Booking progress view created successfully!' as status;
