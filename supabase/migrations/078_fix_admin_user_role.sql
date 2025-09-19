-- Fix admin user role to ensure proper access
DO $$
BEGIN
    -- Update the admin user's role in profiles table
    -- Replace 'luxsess2001@gmail.com' with the actual admin email
    UPDATE public.profiles 
    SET role = 'admin', 
        verification_status = 'approved',
        profile_completed = true
    WHERE email = 'luxsess2001@gmail.com' 
    AND role != 'admin';
    
    -- Also update the user_metadata in auth.users if possible
    -- This requires admin privileges, so we'll log it
    RAISE NOTICE 'Admin user role updated in profiles table';
    
    -- Check if the update was successful
    IF FOUND THEN
        RAISE NOTICE 'Admin user profile updated successfully';
    ELSE
        RAISE NOTICE 'No admin user profile found to update';
    END IF;
END $$;

-- Also ensure all existing admin users have proper verification status
UPDATE public.profiles 
SET verification_status = 'approved',
    profile_completed = true
WHERE role = 'admin' 
AND verification_status != 'approved';

-- Notify that the schema has been updated
NOTIFY pgrst, 'reload schema';
