import type { SupabaseClient } from '@supabase/supabase-js'

type AllowedRole = 'admin' | 'provider' | 'client'

export type RoleGate =
  | { ok: true; user: any; role: AllowedRole }
  | { ok: false; status: 401 | 403; message: string }

export async function requireRole(
  supabase: SupabaseClient,
  roles: AllowedRole[],
  { adminBypass = true }: { adminBypass?: boolean } = {}
): Promise<RoleGate> {
  const { data: u, error: uErr } = await supabase.auth.getUser()
  if (uErr || !u?.user) {
    return { ok: false, status: 401, message: 'UNAUTHENTICATED' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u.user.id)
    .maybeSingle()

  const rawRole = String(profile?.role ?? u.user.user_metadata?.role ?? 'client')
  const role = (['admin', 'provider', 'client'].includes(rawRole) ? rawRole : 'client') as AllowedRole

  if ((adminBypass && role === 'admin') || roles.includes(role)) return { ok: true, user: u.user, role }
  return { ok: false, status: 403, message: `FORBIDDEN: required ${roles.join(', ')}, have ${role}` }
}


