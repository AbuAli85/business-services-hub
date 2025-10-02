import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BookingDetailsErrorProps {
  error?: string | null
}

export function BookingDetailsError({ error }: BookingDetailsErrorProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-96">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Booking Details</h3>
          <p className="text-sm text-gray-600 mb-6">
            {error || 'Failed to load booking details. Please try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
