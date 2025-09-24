import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function AdminLayout({ children }:{ children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) redirect('/auth/sign-in')

  // Fetch role from profiles table or user metadata
  let role: string | null = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    role = (profile?.role as string) || (data.user.user_metadata?.role as string) || null
  } catch {}

  if (role !== 'admin') redirect('/dashboard')
  return <>{children}</>
}


