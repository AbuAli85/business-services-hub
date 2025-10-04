-- Migration #209: Performance Enhancement Indexes
-- Date: 2025-10-05
-- Purpose: Accelerate status & milestone lookups for realtime updates

-- Indexes to accelerate status & milestone lookups
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_progress ON public.bookings(status, progress_percentage);

-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_created_progress ON public.bookings(status, created_at, progress_percentage);

COMMENT ON INDEX idx_milestones_booking_id IS 'Accelerates milestone lookups by booking_id for progress calculations';
COMMENT ON INDEX idx_bookings_status_progress IS 'Optimizes status and progress filtering queries';
COMMENT ON INDEX idx_milestones_status IS 'Speeds up milestone status filtering';
COMMENT ON INDEX idx_bookings_updated_at IS 'Enables efficient ordering by update time';
COMMENT ON INDEX idx_bookings_created_at IS 'Enables efficient ordering by creation time';
COMMENT ON INDEX idx_bookings_status_created_progress IS 'Optimizes dashboard queries combining status, date, and progress';
