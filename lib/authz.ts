import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

type AllowedRole = 'admin' | 'provider' | 'client'

export async function requireRole(roles: AllowedRole[]) {
  const supabase = await createClient()
  
  // Try to get user from session first (cookie-based)
  let { data, error } = await supabase.auth.getUser()
  
  // If no user from cookies, try Authorization header
  if (error || !data?.user) {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 Trying Bearer token authentication')
      try {
        const result = await supabase.auth.getUser(token)
        data = result.data
        error = result.error
      } catch (tokenError) {
        console.log('❌ Bearer token auth failed:', tokenError)
      }
    }
  }
  
  if (error || !data?.user) {
    console.log('❌ Authentication failed - no valid session or token')
    return { ok: false as const, status: 401 as const, message: 'Unauthenticated' }
  }

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


