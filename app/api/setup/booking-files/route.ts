import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create booking_files table
    const createTableSQL = `
      -- Create booking_files table for project file management
      CREATE TABLE IF NOT EXISTS public.booking_files (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
          file_name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          file_type TEXT NOT NULL,
          file_url TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'other')),
          description TEXT,
          uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_booking_files_booking_id ON public.booking_files(booking_id);
      CREATE INDEX IF NOT EXISTS idx_booking_files_category ON public.booking_files(category);
      CREATE INDEX IF NOT EXISTS idx_booking_files_uploaded_by ON public.booking_files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_booking_files_created_at ON public.booking_files(created_at);
    `

    // Create updated_at trigger function
    const createTriggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION update_booking_files_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `

    // Create trigger
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS trigger_update_booking_files_updated_at ON public.booking_files;
      CREATE TRIGGER trigger_update_booking_files_updated_at
          BEFORE UPDATE ON public.booking_files
          FOR EACH ROW
          EXECUTE FUNCTION update_booking_files_updated_at();
    `

    // Enable RLS
    const enableRLSSQL = `
      ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;
    `

    // Create RLS policies
    const createPoliciesSQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view booking files for their bookings" ON public.booking_files;
      DROP POLICY IF EXISTS "Users can upload booking files for their bookings" ON public.booking_files;
      DROP POLICY IF EXISTS "Users can update their own uploaded booking files" ON public.booking_files;
      DROP POLICY IF EXISTS "Users can delete booking files they uploaded or own" ON public.booking_files;

      -- Create new policies
      CREATE POLICY "Users can view booking files for their bookings" ON public.booking_files
          FOR SELECT USING (
              booking_id IN (
                  SELECT b.id FROM public.bookings b
                  WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.booking_participants bp
                      WHERE bp.booking_id = b.id AND bp.user_id = auth.uid()
                  )
              )
          );

      CREATE POLICY "Users can upload booking files for their bookings" ON public.booking_files
          FOR INSERT WITH CHECK (
              booking_id IN (
                  SELECT b.id FROM public.bookings b
                  WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.booking_participants bp
                      WHERE bp.booking_id = b.id AND bp.user_id = auth.uid()
                  )
              )
              AND uploaded_by = auth.uid()
          );

      CREATE POLICY "Users can update their own uploaded booking files" ON public.booking_files
          FOR UPDATE USING (
              uploaded_by = auth.uid()
              AND booking_id IN (
                  SELECT b.id FROM public.bookings b
                  WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.booking_participants bp
                      WHERE bp.booking_id = b.id AND bp.user_id = auth.uid()
                  )
              )
          );

      CREATE POLICY "Users can delete booking files they uploaded or own" ON public.booking_files
          FOR DELETE USING (
              uploaded_by = auth.uid()
              OR booking_id IN (
                  SELECT b.id FROM public.bookings b
                  WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
              )
          );
    `

    // Create storage bucket
    const createStorageBucketSQL = `
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('booking-files', 'booking-files', true)
      ON CONFLICT (id) DO NOTHING;
    `

    // Create storage policies
    const createStoragePoliciesSQL = `
      DROP POLICY IF EXISTS "Users can upload booking files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can view booking files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can delete their own booking files" ON storage.objects;

      CREATE POLICY "Users can upload booking files" ON storage.objects
          FOR INSERT WITH CHECK (
              bucket_id = 'booking-files'
              AND auth.uid() IS NOT NULL
          );

      CREATE POLICY "Users can view booking files" ON storage.objects
          FOR SELECT USING (
              bucket_id = 'booking-files'
              AND auth.uid() IS NOT NULL
          );

      CREATE POLICY "Users can delete their own booking files" ON storage.objects
          FOR DELETE USING (
              bucket_id = 'booking-files'
              AND auth.uid() IS NOT NULL
          );
    `

    // Execute all SQL commands
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (tableError) throw tableError

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL })
    if (indexError) throw indexError

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createTriggerFunctionSQL })
    if (functionError) throw functionError

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTriggerSQL })
    if (triggerError) throw triggerError

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL })
    if (rlsError) throw rlsError

    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
    if (policiesError) throw policiesError

    const { error: bucketError } = await supabase.rpc('exec_sql', { sql: createStorageBucketSQL })
    if (bucketError) throw bucketError

    const { error: storagePoliciesError } = await supabase.rpc('exec_sql', { sql: createStoragePoliciesSQL })
    if (storagePoliciesError) throw storagePoliciesError

    return NextResponse.json({ 
      success: true, 
      message: 'Booking files table and storage setup completed successfully' 
    })

  } catch (error) {
    console.error('Error setting up booking files:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
