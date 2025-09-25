import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

type AllowedRole = 'admin' | 'provider' | 'client'

export async function requireRole(roles: AllowedRole[]) {
  console.log('🔍 requireRole: Starting authentication check for roles:', roles)
  
  const supabase = await createClient()
  console.log('✅ requireRole: Supabase client created')
  
  // Try to get user from session first (cookie-based)
  let { data, error }: { data: any, error: any } = await supabase.auth.getUser()
  console.log('🔍 requireRole: Cookie auth result:', { 
    hasUser: !!data?.user, 
    userId: data?.user?.id,
    error: error?.message 
  })
  
  // If no user from cookies, try Authorization header
  if (error || !data?.user) {
    console.log('🔄 requireRole: Cookie auth failed, trying Authorization header')
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    console.log('🔍 requireRole: Auth header present:', !!authHeader)
    console.log('🔍 requireRole: All headers:', Object.fromEntries(headersList.entries()))
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 requireRole: Trying Bearer token authentication, token length:', token.length)
      console.log('🔍 requireRole: Token preview:', token.substring(0, 50) + '...')
      try {
        // Create a new Supabase client with the token for authentication
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const tokenClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Try direct token verification first
        const { data: tokenUser, error: tokenError } = await tokenClient.auth.getUser(token)
        
        if (tokenError) {
          console.log('❌ requireRole: Direct token verification failed:', tokenError)
          
          // Check if it's an expired token error
          if (tokenError.message?.includes('expired') || tokenError.message?.includes('JWT expired')) {
            console.log('🔄 requireRole: Token expired, informing client to refresh')
            return { ok: false as const, status: 401 as const, message: 'Token expired' }
          }
          
          // Fallback: Set the session with the token
          const { data: sessionData, error: sessionError } = await tokenClient.auth.setSession({
            access_token: token,
            refresh_token: ''
          })
          
          if (sessionError) {
            console.log('❌ requireRole: Session set failed:', sessionError)
          } else {
            console.log('✅ requireRole: Session set successfully')
            data = sessionData
            error = null
          }
        } else {
          console.log('✅ requireRole: Direct token verification successful')
          data = { user: tokenUser }
          error = null
        }
        
        console.log('🔍 requireRole: Bearer token result:', { 
          hasUser: !!data?.user, 
          userId: data?.user?.id,
          error: error?.message
        })
      } catch (tokenError) {
        console.log('❌ requireRole: Bearer token auth failed:', tokenError)
      }
    } else {
      console.log('❌ requireRole: No valid Authorization header found')
    }
  }
  
  if (error || !data?.user) {
    console.log('❌ requireRole: Authentication failed - no valid session or token', {
      error: error?.message,
      hasData: !!data,
      hasUser: !!data?.user
    })
    return { ok: false as const, status: 401 as const, message: 'Unauthenticated' }
  }
  
  console.log('✅ requireRole: User authenticated successfully:', data.user.id)

  let role: AllowedRole | null = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    role = (profile?.role as AllowedRole) || (data.user.user_metadata?.role as AllowedRole) || null
  } catch {}

  if (!role || !roles.includes(role)) {
    return { ok: false as const, status: 403 as const, message: 'Forbidden' }
  }

  return { ok: true as const, user: data.user, role }
}


