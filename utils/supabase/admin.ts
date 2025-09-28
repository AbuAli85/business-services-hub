// Server-only admin client utility
// This file should only be imported in server-side code

import type { SupabaseClient } from '@supabase/supabase-js'

// Admin client for server-side operations with service role key
export async function createAdminClient(): Promise<SupabaseClient> {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations')
  }
  
  const { createClient } = await import('@supabase/supabase-js')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
