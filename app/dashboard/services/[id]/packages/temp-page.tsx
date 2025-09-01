'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ServicePackagesTemp() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Service Packages</h1>
          <p className="text-gray-600 mt-2">
            Package management is temporarily unavailable
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Service Packages</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Packages Feature Coming Soon
              </h3>
              <p className="text-gray-600 mb-6">
                This feature is currently being enhanced and will be available soon.
              </p>
              <Button onClick={() => router.back()}>
                Return to Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
