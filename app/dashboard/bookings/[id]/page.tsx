'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import EnhancedBookingDetails from '@/components/dashboard/enhanced-booking-details'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

type UserRole = 'provider' | 'client'

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.id as string
  const [userRole, setUserRole] = useState<UserRole>('provider')
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase')
        const supabase = await getSupabaseClient()
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id
        if (!userId || !bookingId) return

        // Attempt to read booking party IDs; if not allowed (provider cannot select), default remains 'provider'
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('client_id, provider_id')
          .eq('id', bookingId)
          .single()

        if (!error && booking) {
          if (booking.client_id === userId) {
            if (mounted) setUserRole('client')
            return
          }
          if (booking.provider_id === userId) {
            if (mounted) setUserRole('provider')
            return
          }
        }
      } catch {
        // Ignore and keep default
      }
    })()
    return () => { mounted = false }
  }, [bookingId])

  const testEmailSystem = async () => {
    setTestingEmail(true)
    setEmailTestResult(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'chairman@falconeyegroup.net',
          subject: `Email Test - ${new Date().toLocaleString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">🎉 Email System Test</h2>
              <p>This is a test email from your booking page to verify the notification system is working!</p>
              <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ System Status:</strong> Email notifications are working!</p>
              </div>
              <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Booking ID:</strong> ${bookingId}</p>
            </div>
          `,
          text: `Email System Test\n\nThis is a test email from your booking page to verify the notification system is working!\n\n✅ System Status: Email notifications are working!\n\nTest Time: ${new Date().toLocaleString()}\nBooking ID: ${bookingId}`,
          from: 'notifications@thedigitalmorph.com',
          replyTo: 'noreply@thedigitalmorph.com',
          notificationId: 'test-' + Date.now(),
          notificationType: 'test',
          userId: 'test-user'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailTestResult({
          success: true,
          message: 'Email sent successfully! Check your inbox.'
        })
      } else {
        setEmailTestResult({
          success: false,
          message: `Email failed: ${data.error || 'Unknown error'}`
        })
      }
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setTestingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Email Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email System Test
            </CardTitle>
            <CardDescription>
              Test if your email notification system is working in production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testEmailSystem} 
              disabled={testingEmail}
              className="w-full sm:w-auto"
            >
              {testingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Email System...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

            {emailTestResult && (
              <Alert className={`mt-4 ${emailTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                {emailTestResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={emailTestResult.success ? 'text-green-800' : 'text-red-800'}>
                  {emailTestResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Booking Details Section (includes requirements, actions, etc.) */}
        <EnhancedBookingDetails showProgressCard={false} userRole={userRole} />
      </div>
    </div>
  )
}