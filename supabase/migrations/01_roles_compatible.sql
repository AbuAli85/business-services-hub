-- Migration: Create compatible roles and user_roles tables
-- Description: Work with existing table structure
-- Date: 2025-01-25

-- STEP 1: Check what we have and create compatible structure
-- First, let's see what exists and create a new structure

-- Create new roles table with proper structure
CREATE TABLE IF NOT EXISTS public.roles_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create new user_roles table with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles_new(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique role per user
  UNIQUE(user_id, role_id)
);

-- STEP 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_new_name ON public.roles_new(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_new_user_id ON public.user_roles_new(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_new_role_id ON public.user_roles_new(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_new_active ON public.user_roles_new(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_new_user_active ON public.user_roles_new(user_id, is_active) WHERE is_active = true;

-- STEP 3: Enable RLS
ALTER TABLE public.roles_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles_new ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create basic policies
CREATE POLICY "Anyone can read roles_new" ON public.roles_new
  FOR SELECT USING (true);

CREATE POLICY "Users can read their own roles_new" ON public.user_roles_new
  FOR SELECT USING (user_id = auth.uid());

-- STEP 5: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Create triggers
CREATE TRIGGER update_roles_new_updated_at
  BEFORE UPDATE ON public.roles_new
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_new_updated_at
  BEFORE UPDATE ON public.user_roles_new
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 7: Seed default roles
INSERT INTO public.roles_new (name, display_name, description, is_system, permissions) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true, '{"all": true}'),
  ('provider', 'Service Provider', 'Can create and manage services, view own bookings', true, '{"services": ["create", "read", "update", "delete"], "bookings": ["read_own"], "invoices": ["create", "read", "update"]}'),
  ('client', 'Client', 'Can browse services and create bookings', true, '{"services": ["read"], "bookings": ["create", "read_own"], "reviews": ["create", "read"]}'),
  ('staff', 'Staff Member', 'Limited administrative access', true, '{"bookings": ["read", "update"], "users": ["read"], "reports": ["read"]}'),
  ('manager', 'Manager', 'Can manage providers and view reports', true, '{"providers": ["read", "update"], "bookings": ["read", "update"], "reports": ["read", "create"]}')
ON CONFLICT (name) DO NOTHING;

-- STEP 8: Migrate existing data from old tables
-- Migrate from existing roles table
INSERT INTO public.roles_new (name, display_name, description, is_system, permissions)
SELECT 
  COALESCE(category, 'unknown') as name,
  COALESCE(description, category) as display_name,
  description,
  false as is_system,
  '{}' as permissions
FROM public.roles
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles_new rn WHERE rn.name = COALESCE(roles.category, 'unknown')
);

-- Migrate from existing user_roles table
INSERT INTO public.user_roles_new (user_id, role_id, assigned_at, is_active)
SELECT 
  ur.user_id,
  rn.id as role_id,
  NOW() as assigned_at,
  true as is_active
FROM public.user_roles ur
JOIN public.roles_new rn ON rn.name = ur.role
WHERE ur.user_id IS NOT NULL;

-- STEP 9: Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, is_active BOOLEAN, assigned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name, r.display_name, ur.is_active, ur.assigned_at
  FROM public.user_roles_new ur
  JOIN public.roles_new r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  ORDER BY ur.assigned_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name
  FROM public.user_roles_new ur
  JOIN public.roles_new r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid 
    AND ur.is_active = true
  ORDER BY ur.assigned_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_new ur
    JOIN public.roles_new r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
      AND ur.is_active = true 
      AND r.name = role_name
  );
$$;

-- STEP 10: Grant permissions
GRANT SELECT ON public.roles_new TO authenticated;
GRANT SELECT ON public.user_roles_new TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_primary_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
