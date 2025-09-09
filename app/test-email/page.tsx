'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('chairman@falconeyegroup.net')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const testEmail = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: `Test Email - ${new Date().toLocaleString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">🎉 Email System Test</h2>
              <p>This is a test email to verify your notification system is working in production!</p>
              <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ System Status:</strong> Email notifications are working!</p>
              </div>
              <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Test Type:</strong> Production Email Test</p>
            </div>
          `,
          text: `Email System Test\n\nThis is a test email to verify your notification system is working in production!\n\n✅ System Status: Email notifications are working!\n\nTest Time: ${new Date().toLocaleString()}\nTest Type: Production Email Test`,
          from: 'onboarding@resend.dev',
          replyTo: 'noreply@resend.dev',
          notificationId: 'test-' + Date.now(),
          notificationType: 'test',
          userId: 'test-user'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Email sent successfully! Check your inbox.',
          data: data
        })
      } else {
        setResult({
          success: false,
          message: `Email failed: ${data.error || 'Unknown error'}`,
          data: data
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>📧 Email System Test</CardTitle>
          <CardDescription>
            Test your email notification system to make sure it's working in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Test Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address to test"
            />
            <p className="text-sm text-muted-foreground">
              This email will receive a test notification.
            </p>
          </div>

          <Button 
            onClick={testEmail} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              'Send Test Email'
            )}
          </Button>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
                {result.data && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">What this test does:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Sends a test email to verify the system is working</li>
              <li>Tests the Resend API integration</li>
              <li>Verifies environment variables are set correctly</li>
              <li>Checks if the email API route is accessible</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
