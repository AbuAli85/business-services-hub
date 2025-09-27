-- Migration: Create new roles system alongside existing
-- Description: Create new role management without breaking existing structure
-- Date: 2025-01-25

-- Create new roles table
CREATE TABLE IF NOT EXISTS public.roles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create new user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles_v2(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_v2_name ON public.roles_v2(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_user_id ON public.user_roles_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_role_id ON public.user_roles_v2(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_active ON public.user_roles_v2(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.roles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read roles_v2" ON public.roles_v2
  FOR SELECT USING (true);

CREATE POLICY "Users can read their own roles_v2" ON public.user_roles_v2
  FOR SELECT USING (user_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_roles_v2_updated_at
  BEFORE UPDATE ON public.roles_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_v2_updated_at
  BEFORE UPDATE ON public.user_roles_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default roles
INSERT INTO public.roles_v2 (name, display_name, description, is_system, permissions) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true, '{"all": true}'),
  ('provider', 'Service Provider', 'Can create and manage services, view own bookings', true, '{"services": ["create", "read", "update", "delete"], "bookings": ["read_own"], "invoices": ["create", "read", "update"]}'),
  ('client', 'Client', 'Can browse services and create bookings', true, '{"services": ["read"], "bookings": ["create", "read_own"], "reviews": ["create", "read"]}'),
  ('staff', 'Staff Member', 'Limited administrative access', true, '{"bookings": ["read", "update"], "users": ["read"], "reports": ["read"]}'),
  ('manager', 'Manager', 'Can manage providers and view reports', true, '{"providers": ["read", "update"], "bookings": ["read", "update"], "reports": ["read", "create"]}')
ON CONFLICT (name) DO NOTHING;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_roles_v2(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, is_active BOOLEAN, assigned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name, r.display_name, ur.is_active, ur.assigned_at
  FROM public.user_roles_v2 ur
  JOIN public.roles_v2 r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  ORDER BY ur.assigned_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role_v2(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name
  FROM public.user_roles_v2 ur
  JOIN public.roles_v2 r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid 
    AND ur.is_active = true
  ORDER BY ur.assigned_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role_v2(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2 ur
    JOIN public.roles_v2 r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
      AND ur.is_active = true 
      AND r.name = role_name
  );
$$;

-- Grant permissions
GRANT SELECT ON public.roles_v2 TO authenticated;
GRANT SELECT ON public.user_roles_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_primary_role_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_v2(UUID, TEXT) TO authenticated;
