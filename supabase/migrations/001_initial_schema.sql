-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'provider', 'client', 'staff');
CREATE TYPE booking_status AS ENUM ('draft', 'pending_payment', 'paid', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT,
  phone TEXT,
  country TEXT,
  company_id UUID NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cr_number TEXT, -- Oman CR support
  vat_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., "Digital Marketing"
  status TEXT NOT NULL DEFAULT 'active', -- active | draft | archived
  base_price NUMERIC(12,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'OMR',
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service packages table
CREATE TABLE public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Basic/Pro/Enterprise
  price NUMERIC(12,3) NOT NULL,
  delivery_days INTEGER NOT NULL,
  revisions INTEGER NOT NULL DEFAULT 1,
  features TEXT[], -- array of bullet points
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id),
  requirements JSONB, -- client brief
  status booking_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,3) NOT NULL DEFAULT 0,
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  vat_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal * vat_percent/100.0, 3)) STORED,
  total_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal + (subtotal * vat_percent/100.0), 3)) STORED,
  currency TEXT NOT NULL DEFAULT 'OMR',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachments TEXT[], -- storage URLs
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'OMR',
  status invoice_status NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- booking_update, payment, chat, review
  payload JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_services_provider_id ON public.services(provider_id);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_status ON public.services(status);
CREATE INDEX idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get role from JWT
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE((auth.jwt() ->> 'role')::TEXT, 'client')
$$;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Read own profile or public provider summaries"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR role IN ('provider', 'admin')
);

CREATE POLICY "Update own profile" 
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Insert own profile" 
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Companies policies
CREATE POLICY "Read own company or public info"
ON public.companies FOR SELECT
USING (
  owner_id = auth.uid() OR auth.role() = 'admin'
);

CREATE POLICY "Manage own company"
ON public.companies FOR ALL
USING (owner_id = auth.uid() OR auth.role() = 'admin');

-- Services policies
CREATE POLICY "Read services public" 
ON public.services FOR SELECT 
USING (status = 'active' OR auth.role() IN ('admin', 'provider'));

CREATE POLICY "Provider manages own services" 
ON public.services
FOR INSERT WITH CHECK (provider_id = auth.uid())
, FOR UPDATE USING (provider_id = auth.uid() OR auth.role() = 'admin')
, FOR DELETE USING (provider_id = auth.uid() OR auth.role() = 'admin');

-- Service packages policies
CREATE POLICY "Read service packages public"
ON public.service_packages FOR SELECT
USING (true);

CREATE POLICY "Provider manages own service packages"
ON public.service_packages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id AND s.provider_id = auth.uid()
  ) OR auth.role() = 'admin'
);

-- Bookings policies
CREATE POLICY "Client or Provider can read booking"
ON public.bookings FOR SELECT 
USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR auth.role() = 'admin'
);

CREATE POLICY "Client creates booking" 
ON public.bookings FOR INSERT
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Client or Provider update own booking"
ON public.bookings FOR UPDATE 
USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR auth.role() = 'admin'
);

-- Messages policies
CREATE POLICY "Participants can read/send messages"
ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.client_id = auth.uid() OR b.provider_id = auth.uid() OR auth.role() = 'admin')
  )
), FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.client_id = auth.uid() OR b.provider_id = auth.uid() OR auth.role() = 'admin')
  )
);

-- Reviews policies
CREATE POLICY "Read reviews public"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Client can create review for own booking"
ON public.reviews FOR INSERT
WITH CHECK (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id AND b.client_id = auth.uid() AND b.status = 'completed'
  )
);

-- Invoices policies
CREATE POLICY "Read own invoices"
ON public.invoices FOR SELECT
USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR auth.role() = 'admin'
);

CREATE POLICY "Provider creates invoices for own bookings"
ON public.invoices FOR INSERT
WITH CHECK (
  provider_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id AND b.provider_id = auth.uid()
  )
);

-- Notifications policies
CREATE POLICY "Read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Audit logs policies (admin only)
CREATE POLICY "Admin can read audit logs"
ON public.audit_logs FOR SELECT
USING (auth.role() = 'admin');

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for all tables
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_services_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
