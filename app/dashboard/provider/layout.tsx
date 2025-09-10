'use client'
import React from 'react'
import { RoleGuard } from '@/components/role-guard'

export default function ProviderLayout({ children }:{ children: React.ReactNode }) {
  return (
    <RoleGuard allow={['provider','admin']} redirect="/dashboard">
      {children}
    </RoleGuard>
  )
}


