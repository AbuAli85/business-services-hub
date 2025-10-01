'use client'

import React from 'react'
import { BrandLoader } from '@/components/ui/BrandLoader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <BrandLoader size={72} />
    </div>
  )
}


