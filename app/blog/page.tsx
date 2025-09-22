'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function BlogComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Blog</h1>
        <p className="text-gray-600 mb-6">Insights and updates are on the way. Stay tuned.</p>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}


