-- Migration: Create roles and user_roles tables (STEP BY STEP)
-- Description: Establish proper role management system with RLS policies
-- Date: 2025-01-25

-- STEP 1: Create roles table first
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique role per user
  UNIQUE(user_id, role_id)
);

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON public.user_roles(user_id, is_active) WHERE is_active = true;

-- STEP 4: Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create basic policies (simplified)
CREATE POLICY "Anyone can read roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- STEP 6: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create triggers
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 8: Seed default roles
INSERT INTO public.roles (name, display_name, description, is_system, permissions) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true, '{"all": true}'),
  ('provider', 'Service Provider', 'Can create and manage services, view own bookings', true, '{"services": ["create", "read", "update", "delete"], "bookings": ["read_own"], "invoices": ["create", "read", "update"]}'),
  ('client', 'Client', 'Can browse services and create bookings', true, '{"services": ["read"], "bookings": ["create", "read_own"], "reviews": ["create", "read"]}'),
  ('staff', 'Staff Member', 'Limited administrative access', true, '{"bookings": ["read", "update"], "users": ["read"], "reports": ["read"]}'),
  ('manager', 'Manager', 'Can manage providers and view reports', true, '{"providers": ["read", "update"], "bookings": ["read", "update"], "reports": ["read", "create"]}')
ON CONFLICT (name) DO NOTHING;

-- STEP 9: Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, is_active BOOLEAN, assigned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name, r.display_name, ur.is_active, ur.assigned_at
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  ORDER BY ur.assigned_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
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
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
      AND ur.is_active = true 
      AND r.name = role_name
  );
$$;

-- STEP 10: Grant permissions
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_primary_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
