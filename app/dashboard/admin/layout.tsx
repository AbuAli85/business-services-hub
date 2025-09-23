import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default function AdminLayout({ children }:{ children: React.ReactNode }) {
  const role = headers().get('x-user-role')
  if (role !== 'admin') {
    redirect('/dashboard')
  }
  return (
    <>{children}</>
  )
}


