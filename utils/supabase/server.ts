import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = cookies()
  // headers() available if you need to forward request headers to Supabase fetch
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { return cookieStore.get(name)?.value } catch { return undefined }
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


