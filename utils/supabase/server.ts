import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = cookies()
  const headersList = headers()
  
  console.log('🔍 createClient: Server-side client creation')
  console.log('🔍 createClient: Available cookies:', cookieStore.getAll().map(c => c.name))
  console.log('🔍 createClient: Has authorization header:', !!headersList.get('authorization'))
  
  // headers() available if you need to forward request headers to Supabase fetch
  return createServerClient(
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
}


