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
    
    // Create a client with the Bearer token in headers
    try {
      const authenticatedClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get() { return undefined },
            set() { /* no-op */ },
            remove() { /* no-op */ }
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      // Validate the token by getting the user
      const { data: { user }, error } = await authenticatedClient.auth.getUser()
      if (error || !user) {
        console.log('❌ makeServerClient: Invalid token or user not found:', error)
        return await createSSRClient() // Fallback to cookie-based auth
      }
      
      console.log('✅ makeServerClient: Successfully authenticated with Bearer token for user:', user.id)
      return authenticatedClient
    } catch (sessionError) {
      console.log('❌ makeServerClient: Failed to validate Bearer token:', sessionError)
      return await createSSRClient() // Fallback to cookie-based auth
    }
    
    return client
  }

  return await createSSRClient()
}


