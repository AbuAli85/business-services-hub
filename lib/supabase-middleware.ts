// Create a minimal Supabase client for middleware without realtime
// This avoids Edge Runtime compatibility issues

interface SupabaseClient {
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: any } | null, error: any }>
  }
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: any) => {
        single: () => Promise<{ data: any | null, error: any }>
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
      console.log('🔍 Middleware reading cookies:', { 
        cookieHeader: cookieHeader.substring(0, 100) + (cookieHeader.length > 100 ? '...' : ''),
        hasCookieHeader: !!cookieHeader
      })
      
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [k, v] = c.trim().split('=')
          return [k, decodeURIComponent(v || '')]
        })
      )
      
      const token = cookies['sb-access-token']
      console.log('🔍 Found access token in cookies:', { 
        hasToken: !!token, 
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A',
        allCookieNames: Object.keys(cookies)
      })
      
      return token
    } catch (error) {
      console.error('❌ Error reading cookies:', error)
      return undefined
    }
  }

  const getEffectiveToken = (token?: string): string | undefined => token || readAccessTokenFromCookies()

  return {
    auth: {
      getUser: async (token?: string) => {
        const effectiveToken = getEffectiveToken(token)
        if (!effectiveToken) {
          return { data: null, error: { message: 'No token found' } }
        }
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
              'apikey': supabaseKey,
            }
          })
          
          if (!response.ok) {
            return { data: null, error: { message: 'Failed to get user' } }
          }
          
          const data = await response.json()
          return { data: { user: data }, error: null }
        } catch (error) {
          return { data: null, error: { message: 'Network error' } }
        }
      }
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const effectiveToken = getEffectiveToken()
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${effectiveToken || supabaseKey}`
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
