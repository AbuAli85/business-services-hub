import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type AllowedRole = 'admin' | 'provider' | 'client'

export async function requireRole(roles: AllowedRole[]) {
  console.log('🔍 requireRole: Starting authentication check for roles:', roles)
  
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  
  let user: any = null
  let error: any = null
  
  // If we have an Authorization header with Bearer token, use it directly
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    console.log('🔍 requireRole: Using Bearer token authentication, token length:', token.length)
    
    try {
      // Create a client specifically for token authentication
      const tokenClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Verify the token directly
      const { data: tokenData, error: tokenError } = await tokenClient.auth.getUser(token)
      
      if (tokenError) {
        console.log('❌ requireRole: Token verification failed:', tokenError.message)
        
        // Check if it's an expired token
        if (tokenError.message?.includes('expired') || tokenError.message?.includes('JWT expired')) {
          return { ok: false as const, status: 401 as const, message: 'Token expired' }
        }
        
        error = tokenError
      } else if (tokenData.user) {
        console.log('✅ requireRole: Token authentication successful:', tokenData.user.id)
        user = tokenData.user
      }
    } catch (tokenError) {
      console.log('❌ requireRole: Bearer token processing failed:', tokenError)
      error = tokenError
    }
  }
  
  // If token auth failed or no token, fall back to cookie-based auth
  if (!user) {
    console.log('🔄 requireRole: Falling back to cookie-based authentication')
    const supabase = await createClient()
    console.log('✅ requireRole: Server-side Supabase client created')
    
    const { data: cookieData, error: cookieError } = await supabase.auth.getUser()
    console.log('🔍 requireRole: Cookie auth result:', { 
      hasUser: !!cookieData?.user, 
      userId: cookieData?.user?.id,
      error: cookieError?.message 
    })
    
    if (cookieError) {
      error = cookieError
    } else if (cookieData?.user) {
      user = cookieData.user
    }
  }
  
  if (!user || error) {
    console.log('❌ requireRole: Authentication failed - no valid session or token', {
      error: error?.message,
      hasUser: !!user
    })
    return { ok: false as const, status: 401 as const, message: 'Unauthenticated' }
  }
  
  console.log('✅ requireRole: User authenticated successfully:', user.id)

  let role: AllowedRole | null = null
  try {
    // Create supabase client for role checking if not already created
    let roleCheckClient
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the same token client for role checking
      const token = authHeader.substring(7)
      roleCheckClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // Set the session for this client
      await roleCheckClient.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
    } else {
      // Use the server client for cookie-based auth
      roleCheckClient = await createClient()
    }
    
    const { data: profile } = await roleCheckClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = (profile?.role as AllowedRole) || (user.user_metadata?.role as AllowedRole) || null
    
    console.log('🔍 requireRole: Role check result:', { 
      role, 
      allowedRoles: roles,
      hasProfile: !!profile 
    })
  } catch (roleError) {
    console.log('❌ requireRole: Role check failed:', roleError)
  }

  if (!role || !roles.includes(role)) {
    console.log('❌ requireRole: Role authorization failed:', {
      userRole: role,
      requiredRoles: roles
    })
    return { ok: false as const, status: 403 as const, message: 'Forbidden' }
  }

  console.log('✅ requireRole: Authorization successful:', { userId: user.id, role })
  return { ok: true as const, user, role }
}


