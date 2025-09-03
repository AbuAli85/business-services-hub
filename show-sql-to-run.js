console.log('🔧 RLS Policy Fix - Copy and paste this SQL into Supabase Dashboard:')
console.log('')
console.log('📋 Go to: https://supabase.com/dashboard/project/reootcngcptfogfozlmz/sql')
console.log('')
console.log('📝 Copy and paste this ENTIRE SQL block:')
console.log('')
console.log('='.repeat(80))
console.log('')

const sql = `-- Fix invoices RLS policies to allow clients to generate invoices from their bookings
-- Date: January 2025
-- Description: Update RLS policies to allow clients to create invoices from their own bookings
-- IMPORTANT: This version includes service_role bypass for proper service key functionality

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

-- Create updated policies that allow service key to bypass RLS and clients to generate invoices from their bookings
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow service key to bypass RLS, clients to create invoices from their own bookings, providers to create invoices for their services, and admins to create any invoice
CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        -- Service key can bypass RLS
        auth.role() = 'service_role' OR
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

-- Allow service key to bypass RLS and users to update their own invoices
CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.uid() = provider_id OR
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Users can create invoices" ON invoices IS 'Allows service key to bypass RLS, clients to generate invoices from their bookings, providers to create invoices for their services, and admins to create any invoice';`

console.log(sql)
console.log('')
console.log('='.repeat(80))
console.log('')
console.log('📋 Steps to apply:')
console.log('1. Go to the Supabase dashboard URL above')
console.log('2. Click "New Query"')
console.log('3. Copy and paste the entire SQL block above')
console.log('4. Click "Run"')
console.log('5. Come back here and run: node test-invoice-creation.js')
console.log('')
console.log('🎯 Expected result after running the SQL:')
console.log('✅ SUCCESS! Invoice created: [invoice-id]')
console.log('🎉 RLS policies have been updated successfully!')
