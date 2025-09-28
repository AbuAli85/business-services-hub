import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSSRClient } from '@/utils/supabase/server'

export async function makeServerClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    // Use the same SSR client approach but with the token
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() { /* no-op */ },
          remove() { /* no-op */ }
        }
      }
    )
    
    // Set the session using the Bearer token
    try {
      await client.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
    } catch (sessionError) {
      console.log('❌ makeServerClient: Failed to set session from Bearer token:', sessionError)
    }
    
    return client
  }

  return await createSSRClient()
}


