import { createClient } from '@/utils/supabase/server'

type AllowedRole = 'admin' | 'provider' | 'client'

export async function requireRole(roles: AllowedRole[]) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
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


