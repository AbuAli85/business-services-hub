// Create a minimal Supabase client for middleware without realtime
// This avoids Edge Runtime compatibility issues

interface SupabaseClient {
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: any }, error: any }>
  }
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: any) => {
        single: () => Promise<{ data: any, error: any }>
      }
    }
  }
}

export function createMiddlewareClient(req?: { headers: { get(name: string): string | null } }): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Create a minimal client that only includes auth and basic database operations
  // This avoids importing the full Supabase client with realtime
  const readAccessTokenFromCookies = (): string | undefined => {
    try {
      const cookieHeader = req?.headers.get('cookie') || ''
      // simple parse for sb-access-token
      const parts = cookieHeader.split(';')
      for (const part of parts) {
        const [name, ...rest] = part.trim().split('=')
        if (name === 'sb-access-token') {
          return decodeURIComponent(rest.join('='))
        }
      }
      return undefined
    } catch (_) {
      return undefined
    }
  }

  return {
    auth: {
      getUser: async (token?: string) => {
        try {
          const effectiveToken = token || readAccessTokenFromCookies()
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) {
            return { data: { user: null }, error: { message: 'Failed to get user' } }
          }
          
          const data = await response.json()
          return { data: { user: data }, error: null }
        } catch (error) {
          return { data: { user: null }, error: { message: 'Network error' } }
        }
      }
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (!response.ok) {
                return { data: null, error: { message: 'Failed to fetch data' } }
              }
              
              const data = await response.json()
              return { data: data[0] || null, error: null }
            } catch (error) {
              return { data: null, error: { message: 'Network error' } }
            }
          }
        })
      })
    })
  }
}
