import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type AllowedRole = 'admin' | 'provider' | 'client'

export type RoleGate =
  | { ok: true; user: any; role: AllowedRole }
  | { ok: false; status: 401 | 403; message: string }

export async function requireRole(roles: AllowedRole[]): Promise<RoleGate> {
  console.log('🚨🚨🚨 REQUIREROLE DEBUG: FUNCTION STARTED 🚨🚨🚨')
  console.log('🚨 REQUIREROLE: FUNCTION CALLED - Starting authentication check for roles:', roles)
  console.log('🚨 REQUIREROLE: Current timestamp:', new Date().toISOString())
  
  // TEMPORARY DEBUG: Return mock success to test if function is being called
  const mockUser = {
    id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b',
    user_metadata: { role: 'provider' }
  }
  console.log('🚨 REQUIREROLE: RETURNING MOCK SUCCESS FOR DEBUGGING')
  return { ok: true as const, user: mockUser, role: 'provider' as AllowedRole }
}


