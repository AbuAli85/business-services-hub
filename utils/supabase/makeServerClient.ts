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
      const { data: { user }, error } = await client.auth.getUser(token)
      if (error || !user) {
        console.log('❌ makeServerClient: Invalid token or user not found:', error)
        return await createSSRClient() // Fallback to cookie-based auth
      }
      
      // Set the session so subsequent calls work
      await client.auth.setSession({
        access_token: token,
        refresh_token: '' // We don't have refresh token from Bearer
      })
      
      console.log('✅ makeServerClient: Successfully authenticated with Bearer token for user:', user.id)
    } catch (sessionError) {
      console.log('❌ makeServerClient: Failed to validate Bearer token:', sessionError)
      return await createSSRClient() // Fallback to cookie-based auth
    }
    
    return client
  }

  return await createSSRClient()
}


