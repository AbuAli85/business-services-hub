import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PressComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Press</h1>
        <p className="text-gray-600 mb-6">Media resources and newsroom are coming soon.</p>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
}


