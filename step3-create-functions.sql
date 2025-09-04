-- Step 3: Create functions and triggers
-- Run this third in Supabase Dashboard > SQL Editor

-- Create function to update overdue status
CREATE OR REPLACE FUNCTION update_overdue_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update overdue status for milestones
    UPDATE public.milestones 
    SET 
        is_overdue = TRUE,
        overdue_since = COALESCE(overdue_since, NOW())
    WHERE due_date < NOW() 
    AND status NOT IN ('completed', 'cancelled')
    AND is_overdue = FALSE;
    
    -- Update overdue status for tasks
    UPDATE public.tasks 
    SET 
        is_overdue = TRUE,
        overdue_since = COALESCE(overdue_since, NOW())
    WHERE due_date < NOW() 
    AND status NOT IN ('completed', 'cancelled')
    AND is_overdue = FALSE;
END;
$$;

-- Create function to calculate milestone progress
CREATE OR REPLACE FUNCTION calculate_milestone_progress(milestone_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_progress INTEGER;
BEGIN
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO avg_progress
    FROM public.tasks
    WHERE milestone_id = calculate_milestone_progress.milestone_id;
    
    RETURN avg_progress;
END;
$$;

-- Create function to calculate booking progress
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    weighted_progress DECIMAL;
    total_weight DECIMAL;
BEGIN
    SELECT 
        COALESCE(SUM(progress_percentage * weight), 0) / NULLIF(SUM(weight), 0),
        COALESCE(SUM(weight), 0)
    INTO weighted_progress, total_weight
    FROM public.milestones
    WHERE booking_id = calculate_booking_progress.booking_id;
    
    IF total_weight = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (weighted_progress)::INTEGER;
END;
$$;

-- Create function to update milestone progress when tasks change
CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    milestone_id UUID;
    new_progress INTEGER;
BEGIN
    -- Get milestone_id from the task
    IF TG_OP = 'DELETE' THEN
        milestone_id = OLD.milestone_id;
    ELSE
        milestone_id = NEW.milestone_id;
    END IF;
    
    -- Calculate new progress
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO new_progress
    FROM public.tasks
    WHERE milestone_id = update_milestone_progress.milestone_id;
    
    -- Update milestone progress
    UPDATE public.milestones
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = milestone_id;
    
    -- Update milestone status based on progress
    UPDATE public.milestones
    SET status = CASE
        WHEN new_progress = 100 THEN 'completed'
        WHEN new_progress > 0 THEN 'in_progress'
        ELSE 'pending'
    END
    WHERE id = milestone_id AND status != 'cancelled';
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create function to update booking progress when milestones change
CREATE OR REPLACE FUNCTION update_booking_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_id UUID;
    new_progress INTEGER;
BEGIN
    -- Get booking_id from the milestone
    IF TG_OP = 'DELETE' THEN
        booking_id = OLD.booking_id;
    ELSE
        booking_id = NEW.booking_id;
    END IF;
    
    -- Calculate new progress
    SELECT calculate_booking_progress(booking_id)
    INTO new_progress;
    
    -- Update booking progress
    UPDATE public.bookings
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = booking_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_milestone_progress ON public.tasks;
CREATE TRIGGER trigger_update_milestone_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_progress();

DROP TRIGGER IF EXISTS trigger_update_booking_progress ON public.milestones;
CREATE TRIGGER trigger_update_booking_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_progress();

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_milestone_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_status() TO authenticated;

SELECT 'Functions and triggers created successfully!' as status;
