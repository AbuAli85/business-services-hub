-- Migration: Add Approval Workflow Fields
-- Date: December 2024
-- Description: Add approval workflow fields to bookings table for operational tracking

-- Add approval workflow fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'requested', 'approved', 'rejected', 'under_review')),
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approval_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approval_comments TEXT,
ADD COLUMN IF NOT EXISTS approval_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS operational_status VARCHAR(50) DEFAULT 'new' CHECK (operational_status IN ('new', 'in_review', 'approved', 'rejected', 'on_hold', 'escalated')),
ADD COLUMN IF NOT EXISTS operational_notes TEXT,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS estimated_start_date DATE,
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE,
ADD COLUMN IF NOT EXISTS actual_start_date DATE,
ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS milestone_notes TEXT,
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'reviewed', 'compliant', 'non_compliant', 'requires_action'));

-- Create approval workflow history table
CREATE TABLE IF NOT EXISTS public.booking_approval_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    action_by UUID NOT NULL REFERENCES public.profiles(id),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    comments TEXT,
    metadata JSONB
);

-- Create operational tracking table
CREATE TABLE IF NOT EXISTS public.booking_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    operation_type VARCHAR(100) NOT NULL,
    operation_by UUID NOT NULL REFERENCES public.profiles(id),
    operation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES public.profiles(id),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_approval_status ON public.bookings(approval_status);
CREATE INDEX IF NOT EXISTS idx_bookings_operational_status ON public.bookings(operational_status);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON public.bookings(priority);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON public.bookings(assigned_to);
CREATE INDEX IF NOT EXISTS idx_booking_approval_history_booking_id ON public.booking_approval_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_operations_booking_id ON public.booking_operations(booking_id);

-- Grant permissions
GRANT ALL ON public.booking_approval_history TO authenticated;
GRANT ALL ON public.booking_operations TO authenticated;

-- Create RLS policies for the new tables
ALTER TABLE public.booking_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for approval history
CREATE POLICY "Users can view approval history for their own bookings" ON public.booking_approval_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert approval history for their own bookings" ON public.booking_approval_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- RLS policies for operations
CREATE POLICY "Users can view operations for their own bookings" ON public.booking_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert operations for their own bookings" ON public.booking_operations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Drop and recreate the enhanced_bookings view to include new fields
DROP VIEW IF EXISTS public.enhanced_bookings;

CREATE VIEW public.enhanced_bookings AS
SELECT 
    b.id,
    b.client_id,
    b.provider_id,
    b.service_id,
    b.status,
    b.created_at,
    b.updated_at,
    b.scheduled_date,
    b.scheduled_time,
    b.notes,
    b.amount,
    b.payment_status,
    b.rating,
    b.review,
    b.estimated_duration,
    b.location,
    b.cancellation_reason,
    -- Approval workflow fields
    b.approval_status,
    b.approval_requested_at,
    b.approval_requested_by,
    b.approval_reviewed_at,
    b.approval_reviewed_by,
    b.approval_comments,
    b.approval_rejection_reason,
    -- Operational fields
    b.operational_status,
    b.operational_notes,
    b.priority,
    b.assigned_to,
    b.estimated_start_date,
    b.estimated_completion_date,
    b.actual_start_date,
    b.actual_completion_date,
    b.progress_percentage,
    b.milestone_notes,
    b.quality_score,
    b.compliance_status,
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company_id as client_company_id,
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    p.company_id as provider_company_id,
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    s.currency as service_currency,
    -- Company information
    cc.name as client_company_name,
    pc.name as provider_company_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.companies cc ON c.company_id = cc.id
LEFT JOIN public.companies pc ON p.company_id = pc.id;

-- Grant permissions on updated view
GRANT SELECT ON public.enhanced_bookings TO authenticated;
GRANT SELECT ON public.enhanced_bookings TO anon;
