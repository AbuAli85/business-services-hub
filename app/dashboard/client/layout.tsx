'use client'
import React from 'react'
import { RoleGuard } from '@/components/role-guard'

export default function ClientLayout({ children }:{ children: React.ReactNode }) {
  return (
    <RoleGuard allow={['client','admin']} redirect="/dashboard">
      {children}
    </RoleGuard>
  )
}


