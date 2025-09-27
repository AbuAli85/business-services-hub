-- Migration: Migrate existing user roles to new system
-- Description: Populate user_roles_v2 from existing profiles.role data
-- Date: 2025-01-25

-- Step 1: Migrate existing user roles from profiles.role to user_roles_v2
INSERT INTO public.user_roles_v2 (user_id, role_id, assigned_at, is_active)
SELECT 
  p.id as user_id,
  r.id as role_id,
  p.created_at as assigned_at,
  true as is_active
FROM public.profiles p
JOIN public.roles_v2 r ON r.name = p.role
WHERE p.role IS NOT NULL
  AND p.id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 2: Handle any profiles with NULL roles (default to client)
INSERT INTO public.user_roles_v2 (user_id, role_id, assigned_at, is_active)
SELECT 
  p.id as user_id,
  r.id as role_id,
  p.created_at as assigned_at,
  true as is_active
FROM public.profiles p
CROSS JOIN public.roles_v2 r
WHERE p.role IS NULL
  AND r.name = 'client'
  AND p.id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 3: Create a view for backward compatibility during transition
CREATE OR REPLACE VIEW public.profiles_with_roles_v2 AS
SELECT
  p.*,
  COALESCE(ur.role_name, 'client') as primary_role,
  ur.role_display_name as primary_role_display_name,
  ur.is_active as role_active,
  ur.assigned_at as role_assigned_at
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT r.name as role_name, r.display_name as role_display_name, ur.is_active, ur.assigned_at
  FROM public.user_roles_v2 ur
  JOIN public.roles_v2 r ON ur.role_id = r.id
  WHERE ur.user_id = p.id AND ur.is_active = true
  ORDER BY ur.assigned_at DESC
  LIMIT 1
) ur ON true;

-- Step 4: Create function to get users with their roles (for APIs)
CREATE OR REPLACE FUNCTION public.get_users_with_roles_v2()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  company_id UUID,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  roles JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.country,
    p.company_id,
    p.is_verified,
    p.created_at,
    p.updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'name', r.name,
          'display_name', r.display_name,
          'is_active', ur.is_active,
          'assigned_at', ur.assigned_at
        ) ORDER BY ur.assigned_at DESC
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::json
    ) as roles
  FROM public.profiles p
  LEFT JOIN public.user_roles_v2 ur ON ur.user_id = p.id
  LEFT JOIN public.roles_v2 r ON ur.role_id = r.id
  GROUP BY p.id, p.email, p.full_name, p.phone, p.country, p.company_id, p.is_verified, p.created_at, p.updated_at;
$$;

-- Step 5: Create function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role_v2(
  target_user_id UUID,
  role_name TEXT,
  assigned_by_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_id UUID;
  current_user_has_admin BOOLEAN;
BEGIN
  -- Check if current user has admin role
  SELECT has_role_v2(auth.uid(), 'admin') INTO current_user_has_admin;

  IF NOT current_user_has_admin THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;

  -- Get role ID
  SELECT id INTO role_id FROM public.roles_v2 WHERE name = role_name;

  IF role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;

  -- Deactivate any existing active roles for this user
  UPDATE public.user_roles_v2
  SET is_active = false, updated_at = now()
  WHERE user_id = target_user_id AND is_active = true;

  -- Assign new role
  INSERT INTO public.user_roles_v2 (user_id, role_id, assigned_by, is_active)
  VALUES (target_user_id, role_id, assigned_by_user_id, true)
  ON CONFLICT (user_id, role_id)
  DO UPDATE SET
    is_active = true,
    assigned_by = assigned_by_user_id,
    assigned_at = now(),
    updated_at = now();

  RETURN true;
END;
$$;

-- Step 6: Create function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role_v2(
  target_user_id UUID,
  role_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_has_admin BOOLEAN;
BEGIN
  -- Check if current user has admin role
  SELECT has_role_v2(auth.uid(), 'admin') INTO current_user_has_admin;

  IF NOT current_user_has_admin THEN
    RAISE EXCEPTION 'Only administrators can remove roles';
  END IF;

  -- Deactivate the role
  UPDATE public.user_roles_v2
  SET is_active = false, updated_at = now()
  WHERE user_id = target_user_id
    AND role_id = (SELECT id FROM public.roles_v2 WHERE name = role_name)
    AND is_active = true;

  RETURN true;
END;
$$;

-- Step 7: Grant permissions
GRANT SELECT ON public.profiles_with_roles_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role_v2(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role_v2(UUID, TEXT) TO authenticated;
