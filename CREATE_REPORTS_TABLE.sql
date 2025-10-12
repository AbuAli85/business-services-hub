-- Create reports table for storing generated reports
-- This table is optional - the reports page will work without it (showing empty state)

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('financial', 'user', 'service', 'booking', 'analytics')),
  description text,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  file_url text,
  metrics jsonb DEFAULT '{}'::jsonb,
  generated_at timestamp with time zone DEFAULT now(),
  generated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports(generated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policy for admins to create reports
CREATE POLICY "Admins can create reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policy for admins to update reports
CREATE POLICY "Admins can update reports"
  ON public.reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create policy for admins to delete reports
CREATE POLICY "Admins can delete reports"
  ON public.reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE public.reports IS 'Stores generated reports for the admin dashboard';

-- Sample data (optional)
-- INSERT INTO public.reports (title, type, description, status, file_url, metrics, generated_at)
-- VALUES 
-- ('Monthly Financial Report', 'financial', 'Revenue and expenses for the month', 'ready', '/reports/financial-2024-01.pdf', '{"totalRevenue": 15750, "totalExpenses": 8200}', NOW() - INTERVAL '1 day'),
-- ('User Growth Report', 'user', 'User registration and activity metrics', 'ready', '/reports/users-2024-01.pdf', '{"totalUsers": 156, "newUsers": 23}', NOW() - INTERVAL '2 days');

