-- Migration: Enhance Service Packages Table
-- Description: Add professional package features and improve service packages functionality
-- Date: 2024-12-19

-- Add new columns to service_packages table if they don't exist
ALTER TABLE service_packages 
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON service_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_popular ON service_packages(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_packages_premium ON service_packages(is_premium) WHERE is_premium = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_service_packages_updated_at ON service_packages;
CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON service_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_service_packages_updated_at();

-- Add RLS policies for service_packages
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view packages for approved services
CREATE POLICY "Users can view packages for approved services" ON service_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = service_packages.service_id 
      AND services.approval_status = 'approved'
    )
  );

-- Policy: Service owners can manage their packages
CREATE POLICY "Service owners can manage their packages" ON service_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = service_packages.service_id 
      AND services.provider_id = auth.uid()
    )
  );

-- Policy: Admins can manage all packages
CREATE POLICY "Admins can manage all packages" ON service_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON service_packages TO authenticated;
GRANT ALL ON service_packages TO service_role;
