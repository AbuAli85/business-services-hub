import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase Client Configuration
 * 
 * IMPORTANT for Single Sign-On:
 * - storageKey must match other platforms (BusinessHub, Contract-Management-System)
 * - All platforms must use same Supabase project (same URL and anon key)
 * - This allows one login to work across all platforms
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // CRITICAL: This storage key must match all other platforms for SSO
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )
}
