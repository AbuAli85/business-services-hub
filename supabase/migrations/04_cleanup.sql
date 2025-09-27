-- Migration: Cleanup and drift detection
-- Description: Remove denormalized columns and add drift detection
-- Date: 2025-01-25

-- 1. Create drift detection function
CREATE OR REPLACE FUNCTION public.detect_data_drift()
RETURNS TABLE (
  drift_type TEXT,
  table_name TEXT,
  record_id UUID,
  field_name TEXT,
  current_value TEXT,
  expected_value TEXT,
  severity TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Check for email drift between auth.users and profiles
  SELECT 
    'email_drift' as drift_type,
    'profiles' as table_name,
    p.id as record_id,
    'email' as field_name,
    p.email as current_value,
    au.email as expected_value,
    CASE 
      WHEN p.email IS NULL OR au.email IS NULL THEN 'high'
      WHEN p.email != au.email THEN 'medium'
      ELSE 'low'
    END as severity
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE p.email IS DISTINCT FROM au.email
    AND au.email IS NOT NULL
  
  UNION ALL
  
  -- Check for role drift between profiles.role and user_roles
  SELECT 
    'role_drift' as drift_type,
    'profiles' as table_name,
    p.id as record_id,
    'role' as field_name,
    p.role as current_value,
    COALESCE(ur.role_name, 'client') as expected_value,
    CASE 
      WHEN p.role IS NULL AND ur.role_name IS NULL THEN 'low'
      WHEN p.role IS DISTINCT FROM ur.role_name THEN 'high'
      ELSE 'low'
    END as severity
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT r.name as role_name
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p.id AND ur.is_active = true
    ORDER BY ur.assigned_at DESC
    LIMIT 1
  ) ur ON true
  WHERE p.role IS DISTINCT FROM COALESCE(ur.role_name, 'client')
  
  UNION ALL
  
  -- Check for denormalized data drift in bookings
  SELECT 
    'denormalized_drift' as drift_type,
    'bookings' as table_name,
    b.id as record_id,
    'service_title' as field_name,
    b.service_title as current_value,
    s.title as expected_value,
    CASE 
      WHEN b.service_title IS NULL AND s.title IS NULL THEN 'low'
      WHEN b.service_title IS DISTINCT FROM s.title THEN 'medium'
      ELSE 'low'
    END as severity
  FROM public.bookings b
  LEFT JOIN public.services s ON b.service_id = s.id
  WHERE b.service_title IS DISTINCT FROM s.title
  
  UNION ALL
  
  SELECT 
    'denormalized_drift' as drift_type,
    'bookings' as table_name,
    b.id as record_id,
    'client_name' as field_name,
    b.client_name as current_value,
    p.full_name as expected_value,
    CASE 
      WHEN b.client_name IS NULL AND p.full_name IS NULL THEN 'low'
      WHEN b.client_name IS DISTINCT FROM p.full_name THEN 'medium'
      ELSE 'low'
    END as severity
  FROM public.bookings b
  LEFT JOIN public.profiles p ON b.client_id = p.id
  WHERE b.client_name IS DISTINCT FROM p.full_name
  
  UNION ALL
  
  SELECT 
    'denormalized_drift' as drift_type,
    'bookings' as table_name,
    b.id as record_id,
    'provider_name' as field_name,
    b.provider_name as current_value,
    p.full_name as expected_value,
    CASE 
      WHEN b.provider_name IS NULL AND p.full_name IS NULL THEN 'low'
      WHEN b.provider_name IS DISTINCT FROM p.full_name THEN 'medium'
      ELSE 'low'
    END as severity
  FROM public.bookings b
  LEFT JOIN public.profiles p ON b.provider_id = p.id
  WHERE b.provider_name IS DISTINCT FROM p.full_name;
$$;

-- 2. Create cleanup function for email drift
CREATE OR REPLACE FUNCTION public.cleanup_email_drift()
RETURNS TABLE (
  updated_count INTEGER,
  errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  errors TEXT[] := '{}';
  profile_record RECORD;
BEGIN
  -- Update profiles.email to match auth.users.email
  FOR profile_record IN 
    SELECT p.id, p.email as profile_email, au.email as auth_email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE p.email IS DISTINCT FROM au.email
      AND au.email IS NOT NULL
  LOOP
    BEGIN
      UPDATE public.profiles 
      SET email = profile_record.auth_email, updated_at = now()
      WHERE id = profile_record.id;
      
      updated_count := updated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, 'Failed to update profile ' || profile_record.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT updated_count, errors;
END;
$$;

-- 3. Create cleanup function for role drift
CREATE OR REPLACE FUNCTION public.cleanup_role_drift()
RETURNS TABLE (
  updated_count INTEGER,
  errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  errors TEXT[] := '{}';
  profile_record RECORD;
  role_id UUID;
BEGIN
  -- Update profiles.role to match user_roles
  FOR profile_record IN 
    SELECT 
      p.id, 
      p.role as profile_role,
      COALESCE(ur.role_name, 'client') as expected_role
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT r.name as role_name
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = p.id AND ur.is_active = true
      ORDER BY ur.assigned_at DESC
      LIMIT 1
    ) ur ON true
    WHERE p.role IS DISTINCT FROM COALESCE(ur.role_name, 'client')
  LOOP
    BEGIN
      -- Get role ID
      SELECT id INTO role_id FROM public.roles WHERE name = profile_record.expected_role;
      
      IF role_id IS NULL THEN
        errors := array_append(errors, 'Role not found: ' || profile_record.expected_role);
        CONTINUE;
      END IF;
      
      -- Update profile role
      UPDATE public.profiles 
      SET role = profile_record.expected_role, updated_at = now()
      WHERE id = profile_record.id;
      
      -- Ensure user_roles is in sync
      INSERT INTO public.user_roles (user_id, role_id, is_active)
      VALUES (profile_record.id, role_id, true)
      ON CONFLICT (user_id, role_id) 
      DO UPDATE SET is_active = true, updated_at = now();
      
      updated_count := updated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, 'Failed to update profile ' || profile_record.id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT updated_count, errors;
END;
$$;

-- 4. Create function to remove denormalized columns (to be run after UI migration)
CREATE OR REPLACE FUNCTION public.remove_denormalized_columns()
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function should only be run after confirming UI has been updated
  -- to use the booking_enriched view instead of denormalized columns
  
  -- Remove denormalized columns from bookings table
  ALTER TABLE public.bookings DROP COLUMN IF EXISTS service_title;
  ALTER TABLE public.bookings DROP COLUMN IF EXISTS client_name;
  ALTER TABLE public.bookings DROP COLUMN IF EXISTS provider_name;
  
  -- Drop the sync trigger
  DROP TRIGGER IF EXISTS sync_booking_denormalized_columns_trigger ON public.bookings;
  DROP FUNCTION IF EXISTS public.sync_booking_denormalized_columns();
  
  RETURN QUERY SELECT true, 'Denormalized columns removed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Failed to remove denormalized columns: ' || SQLERRM;
END;
$$;

-- 5. Create monitoring view for data quality
CREATE OR REPLACE VIEW public.data_quality_monitor AS
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as records_with_email,
  COUNT(*) FILTER (WHERE full_name IS NOT NULL AND full_name != '') as records_with_name,
  COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as records_with_phone,
  COUNT(*) FILTER (WHERE role IS NOT NULL) as records_with_role
FROM public.profiles

UNION ALL

SELECT 
  'user_roles' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_roles,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT role_id) as unique_roles,
  COUNT(*) FILTER (WHERE assigned_by IS NOT NULL) as assigned_by_admin
FROM public.user_roles

UNION ALL

SELECT 
  'bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE service_title IS NOT NULL) as with_service_title,
  COUNT(*) FILTER (WHERE client_name IS NOT NULL) as with_client_name,
  COUNT(*) FILTER (WHERE provider_name IS NOT NULL) as with_provider_name,
  COUNT(*) FILTER (WHERE amount_cents IS NOT NULL) as with_amount_cents
FROM public.bookings;

-- 6. Create function to get drift summary
CREATE OR REPLACE FUNCTION public.get_drift_summary()
RETURNS TABLE (
  drift_type TEXT,
  total_count BIGINT,
  high_severity BIGINT,
  medium_severity BIGINT,
  low_severity BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    drift_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
    COUNT(*) FILTER (WHERE severity = 'low') as low_severity
  FROM public.detect_data_drift()
  GROUP BY drift_type
  ORDER BY total_count DESC;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.detect_data_drift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_drift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_role_drift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_denormalized_columns() TO authenticated;
GRANT SELECT ON public.data_quality_monitor TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_drift_summary() TO authenticated;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON public.user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
