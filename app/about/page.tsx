'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">About Business Services Hub</h1>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-7">
              We connect businesses with trusted service providers, enabling growth through
              professional services, transparent pricing, and streamlined collaboration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


