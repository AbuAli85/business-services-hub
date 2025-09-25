import { createClient } from '@/utils/supabase/server'
import { headers, cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type AllowedRole = 'admin' | 'provider' | 'client'

export type RoleGate =
  | { ok: true; user: any; role: AllowedRole }
  | { ok: false; status: 401 | 403; message: string }

export async function requireRole(roles: AllowedRole[]): Promise<RoleGate> {
  try {
    const hdrs = headers()
    const cookieStore = cookies()

    const authHeader = hdrs.get('authorization')
    const xAuthHeader = hdrs.get('x-supabase-auth') || hdrs.get('x-supabase-access-token')
    const cookieToken = cookieStore.get('sb-access-token')?.value || null
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (xAuthHeader || cookieToken || null)

    // Prefer token client when we have a bearer
    const supabase = token
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, detectSessionInUrl: false },
          }
        )
      : await createClient()

    // Make sure RLS sees the token when provided
    if (token) {
      try { await supabase.auth.setSession({ access_token: token, refresh_token: '' }) } catch {}
    }

    const { data: authUser, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authUser?.user) {
      return { ok: false, status: 401, message: authErr?.message || 'Unauthenticated' }
    }

    const user = authUser.user
    // Determine role from profiles first, fallback to metadata
    let effectiveRole: AllowedRole = 'client'
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const r = (profile?.role || user.user_metadata?.role || 'client') as AllowedRole
      effectiveRole = r === 'admin' || r === 'provider' || r === 'client' ? r : 'client'
    } catch {
      const r = (user.user_metadata?.role || 'client') as AllowedRole
      effectiveRole = r === 'admin' || r === 'provider' || r === 'client' ? r : 'client'
    }

    if (!roles.includes(effectiveRole)) {
      return { ok: false, status: 403, message: 'Forbidden: insufficient role' }
    }

    return { ok: true as const, user, role: effectiveRole }
  } catch (e) {
    return { ok: false, status: 401, message: 'Authentication failed' }
  }
}


