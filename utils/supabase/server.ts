import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = cookies()
  const headersList = headers()
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 createClient: Server-side client creation')
    console.log('🔍 createClient: Available cookies:', cookieStore.getAll().map(c => c.name))
    console.log('🔍 createClient: Has authorization header:', !!headersList.get('authorization'))
  }
  
  const authHeader = headersList.get('authorization')
  
  // If we have a Bearer token, extract and use it for session initialization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (process.env.NODE_ENV !== 'production') console.log('🔍 createClient: Found Bearer token, initializing with token session')
    
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            try { 
              const value = cookieStore.get(name)?.value
              console.log(`🔍 createClient: Getting cookie ${name}:`, value ? 'present' : 'absent')
              return value
            } catch { 
              console.log(`❌ createClient: Failed to get cookie ${name}`)
              return undefined 
            }
          },
          set() {
            // No-op on server components; middleware handles cookie refresh
          },
          remove() {
            // No-op on server components
          }
        }
      }
    )
    
    // Set the session using the Bearer token
    try {
      await client.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
      if (process.env.NODE_ENV !== 'production') console.log('✅ createClient: Session set from Bearer token')
    } catch (sessionError) {
      if (process.env.NODE_ENV !== 'production') console.log('❌ createClient: Failed to set session from Bearer token:', sessionError)
    }
    
    return client
  }
  
  // Default cookie-based client
  if (process.env.NODE_ENV !== 'production') console.log('🔍 createClient: Using cookie-based authentication')
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { 
            const value = cookieStore.get(name)?.value
            if (process.env.NODE_ENV !== 'production') console.log(`🔍 createClient: Getting cookie ${name}:`, value ? 'present' : 'absent')
            return value
          } catch { 
            if (process.env.NODE_ENV !== 'production') console.log(`❌ createClient: Failed to get cookie ${name}`)
            return undefined 
          }
        },
        set() {
          // No-op on server components; middleware handles cookie refresh
        },
        remove() {
          // No-op on server components
        }
      }
    }
  )
}


