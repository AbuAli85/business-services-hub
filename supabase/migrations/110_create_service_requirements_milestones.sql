-- Migration: Create Service Requirements and Milestones Tables
-- Date: January 2025
-- Description: Add support for service requirements and milestone templates

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add new columns to services table for enhanced Create Service flow
DO $$
BEGIN
    -- Add duration column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'duration'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN duration TEXT;
        
        RAISE NOTICE 'Added duration column to services table';
    END IF;
    
    -- Add deliverables column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'deliverables'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN deliverables TEXT[];
        
        RAISE NOTICE 'Added deliverables column to services table';
    END IF;
    
    -- Update status column to include pending_approval
    ALTER TABLE public.services 
    DROP CONSTRAINT IF EXISTS services_status_check;
    
    ALTER TABLE public.services 
    ADD CONSTRAINT services_status_check 
    CHECK (status IN ('active', 'draft', 'archived', 'pending_approval'));
    
    RAISE NOTICE 'Updated services status constraint';
END $$;

-- 2. Create service_requirements table
CREATE TABLE IF NOT EXISTS public.service_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_requirements
ALTER TABLE public.service_requirements ENABLE ROW LEVEL SECURITY;

-- Allow providers to manage their service requirements
DROP POLICY IF EXISTS "Providers can manage their service requirements" ON public.service_requirements;
CREATE POLICY "Providers can manage their service requirements" ON public.service_requirements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services s 
            WHERE s.id = service_requirements.service_id 
            AND s.provider_id = auth.uid()
        )
    );

-- Allow clients to read service requirements
DROP POLICY IF EXISTS "Clients can read service requirements" ON public.service_requirements;
CREATE POLICY "Clients can read service requirements" ON public.service_requirements
    FOR SELECT USING (true);

-- 3. Create service_milestones table (milestone templates)
CREATE TABLE IF NOT EXISTS public.service_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    milestone_title TEXT NOT NULL,
    description TEXT,
    estimated_duration INTEGER DEFAULT 7, -- in days
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for service_milestones
ALTER TABLE public.service_milestones ENABLE ROW LEVEL SECURITY;

-- Allow providers to manage their service milestones
DROP POLICY IF EXISTS "Providers can manage their service milestones" ON public.service_milestones;
CREATE POLICY "Providers can manage their service milestones" ON public.service_milestones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.services s 
            WHERE s.id = service_milestones.service_id 
            AND s.provider_id = auth.uid()
        )
    );

-- Allow clients to read service milestones
DROP POLICY IF EXISTS "Clients can read service milestones" ON public.service_milestones;
CREATE POLICY "Clients can read service milestones" ON public.service_milestones
    FOR SELECT USING (true);

-- 4. Create booking_services table (linking table)
CREATE TABLE IF NOT EXISTS public.booking_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, service_id)
);

-- Add RLS policies for booking_services
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their booking services
DROP POLICY IF EXISTS "Users can manage their booking services" ON public.booking_services;
CREATE POLICY "Users can manage their booking services" ON public.booking_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_services.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- 5. Update booking_milestones table to reference service milestones
DO $$
BEGIN
    -- Add service_milestone_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'service_milestone_id'
    ) THEN
        ALTER TABLE public.milestones 
        ADD COLUMN service_milestone_id UUID REFERENCES public.service_milestones(id);
        
        RAISE NOTICE 'Added service_milestone_id column to milestones table';
    END IF;
    
    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.milestones 
        ADD COLUMN order_index INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added order_index column to milestones table';
    END IF;
END $$;

-- 6. Create function to auto-clone service milestones when booking is created
CREATE OR REPLACE FUNCTION clone_service_milestones_to_booking()
RETURNS TRIGGER AS $$
DECLARE
    milestone_record RECORD;
    new_milestone_id UUID;
BEGIN
    -- Only proceed if this is a new booking with a service_id
    IF NEW.service_id IS NOT NULL THEN
        -- Clone all milestones from the service to the booking
        FOR milestone_record IN 
            SELECT * FROM public.service_milestones 
            WHERE service_id = NEW.service_id 
            ORDER BY order_index ASC
        LOOP
            INSERT INTO public.milestones (
                booking_id,
                service_milestone_id,
                title,
                description,
                status,
                priority,
                progress_percentage,
                weight,
                order_index,
                due_date
            ) VALUES (
                NEW.id,
                milestone_record.id,
                milestone_record.milestone_title,
                milestone_record.description,
                'pending',
                'medium',
                0,
                1.0,
                milestone_record.order_index,
                NEW.created_at + (milestone_record.estimated_duration || ' days')::INTERVAL
            );
        END LOOP;
        
        -- Insert into booking_services linking table
        INSERT INTO public.booking_services (booking_id, service_id)
        VALUES (NEW.id, NEW.service_id)
        ON CONFLICT (booking_id, service_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the function with the name expected by the API
CREATE OR REPLACE FUNCTION generate_milestones_from_templates(booking_uuid UUID)
RETURNS VOID AS $$
DECLARE
    booking_service_id UUID;
    milestone_record RECORD;
    booking_record RECORD;
BEGIN
    -- Get the booking record
    SELECT * INTO booking_record FROM public.bookings WHERE id = booking_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', booking_uuid;
    END IF;
    
    -- Get the service_id for this booking
    booking_service_id := booking_record.service_id;
    
    IF booking_service_id IS NULL THEN
        RAISE NOTICE 'No service_id found for booking %', booking_uuid;
        RETURN;
    END IF;
    
    -- Clone all milestones from the service to the booking
    FOR milestone_record IN 
        SELECT * FROM public.service_milestones 
        WHERE service_id = booking_service_id 
        ORDER BY order_index ASC
    LOOP
        INSERT INTO public.milestones (
            booking_id,
            service_milestone_id,
            title,
            description,
            status,
            priority,
            progress_percentage,
            weight,
            order_index,
            due_date
        ) VALUES (
            booking_uuid,
            milestone_record.id,
            milestone_record.milestone_title,
            milestone_record.description,
            'pending',
            'medium',
            0,
            1.0,
            milestone_record.order_index,
            booking_record.created_at + (milestone_record.estimated_duration || ' days')::INTERVAL
        );
    END LOOP;
    
    -- Insert into booking_services linking table
    INSERT INTO public.booking_services (booking_id, service_id)
    VALUES (booking_uuid, booking_service_id)
    ON CONFLICT (booking_id, service_id) DO NOTHING;
    
    RAISE NOTICE 'Generated % milestones for booking %', 
        (SELECT COUNT(*) FROM public.service_milestones WHERE service_id = booking_service_id), 
        booking_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-clone milestones
DROP TRIGGER IF EXISTS trigger_clone_service_milestones ON public.bookings;
CREATE TRIGGER trigger_clone_service_milestones
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION clone_service_milestones_to_booking();

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requirements_service_id ON public.service_requirements(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requirements_order ON public.service_requirements(service_id, order_index);

CREATE INDEX IF NOT EXISTS idx_service_milestones_service_id ON public.service_milestones(service_id);
CREATE INDEX IF NOT EXISTS idx_service_milestones_order ON public.service_milestones(service_id, order_index);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON public.booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON public.booking_services(service_id);

CREATE INDEX IF NOT EXISTS idx_milestones_service_milestone_id ON public.milestones(service_milestone_id);

-- 8. Create helper functions for service management
CREATE OR REPLACE FUNCTION get_service_with_details(service_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'service', row_to_json(s),
        'requirements', COALESCE(
            (SELECT json_agg(row_to_json(sr) ORDER BY sr.order_index) 
             FROM public.service_requirements sr 
             WHERE sr.service_id = service_uuid), 
            '[]'::json
        ),
        'milestones', COALESCE(
            (SELECT json_agg(row_to_json(sm) ORDER BY sm.order_index) 
             FROM public.service_milestones sm 
             WHERE sm.service_id = service_uuid), 
            '[]'::json
        ),
        'packages', COALESCE(
            (SELECT json_agg(row_to_json(sp)) 
             FROM public.service_packages sp 
             WHERE sp.service_id = service_uuid), 
            '[]'::json
        )
    ) INTO result
    FROM public.services s
    WHERE s.id = service_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.service_requirements TO authenticated;
GRANT ALL ON public.service_milestones TO authenticated;
GRANT ALL ON public.booking_services TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clone_service_milestones_to_booking() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.service_requirements IS 'Requirements that clients need to provide for each service';
COMMENT ON TABLE public.service_milestones IS 'Milestone templates for services that get cloned to bookings';
COMMENT ON TABLE public.booking_services IS 'Linking table between bookings and services';
COMMENT ON FUNCTION clone_service_milestones_to_booking() IS 'Automatically clones service milestones to booking when booking is created';
COMMENT ON FUNCTION get_service_with_details(UUID) IS 'Returns complete service details including requirements, milestones, and packages';
