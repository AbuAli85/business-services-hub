-- Migration: Fix Bookings Foreign Key Constraint
-- Date: December 2024
-- Description: Fix the foreign key constraint that references non-existent provider_services table

-- First, let's check what constraints exist on the bookings table
DO $$
BEGIN
    -- Check if the problematic constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_service_fk' 
        AND table_name = 'bookings'
    ) THEN
        -- Drop the problematic constraint
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_fk;
        RAISE NOTICE 'Dropped problematic constraint: bookings_service_fk';
    ELSE
        RAISE NOTICE 'Constraint bookings_service_fk does not exist';
    END IF;
END $$;

-- Now let's add the correct foreign key constraint to reference the services table
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_service_id_fkey' 
        AND table_name = 'bookings'
    ) THEN
        -- Add the correct foreign key constraint
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added correct constraint: bookings_service_id_fkey';
    ELSE
        RAISE NOTICE 'Constraint bookings_service_id_fkey already exists';
    END IF;
END $$;

-- Verify the constraint was created correctly
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'bookings'
    AND kcu.column_name = 'service_id';
