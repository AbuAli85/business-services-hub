import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

type AllowedRole = 'admin' | 'provider' | 'client'

export async function requireRole(roles: AllowedRole[]) {
  console.log('🔍 requireRole: Starting authentication check for roles:', roles)
  
  const supabase = await createClient()
  console.log('✅ requireRole: Supabase client created')
  
  // Try to get user from session first (cookie-based)
  let { data, error } = await supabase.auth.getUser()
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
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 requireRole: Trying Bearer token authentication, token length:', token.length)
      try {
        const result = await supabase.auth.getUser(token)
        data = result.data
        error = result.error
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


