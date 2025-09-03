-- Fix invoices RLS policies to allow clients to generate invoices from their bookings
-- Date: January 2025
-- Description: Update RLS policies to allow clients to create invoices from their own bookings

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

-- Create updated policies that allow clients to generate invoices from their bookings
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow clients to create invoices from their own bookings, providers to create invoices for their services, and admins to create any invoice
CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        -- Clients can create invoices from their own bookings
        (auth.uid() = client_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND client_id = auth.uid()
        )) OR
        -- Providers can create invoices for their services
        (auth.uid() = provider_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND provider_id = auth.uid()
        )) OR
        -- Admins can create any invoice
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to update their own invoices
CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (
        auth.uid() = provider_id OR
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Users can create invoices" ON invoices IS 'Allows clients to generate invoices from their bookings, providers to create invoices for their services, and admins to create any invoice';
