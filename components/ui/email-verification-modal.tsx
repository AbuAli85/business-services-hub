'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onResendEmail?: () => Promise<void>
}

export function EmailVerificationModal({ 
  isOpen, 
  onClose, 
  email, 
  onResendEmail 
}: EmailVerificationModalProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendCount, setResendCount] = useState(0)

  const handleResendEmail = async () => {
    if (resendCount >= 3) {
      toast.error('Maximum resend attempts reached. Please try again later.')
      return
    }

    setIsResending(true)
    try {
      if (onResendEmail) {
        await onResendEmail()
        setResendCount(prev => prev + 1)
        toast.success('Verification email sent successfully!')
      }
    } catch (error) {
      toast.error('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const getEmailProvider = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase()
    const providers: { [key: string]: string } = {
      'gmail.com': 'Gmail',
      'yahoo.com': 'Yahoo Mail',
      'outlook.com': 'Outlook',
      'hotmail.com': 'Hotmail',
      'icloud.com': 'iCloud Mail',
      'aol.com': 'AOL Mail'
    }
    return providers[domain] || 'Your email provider'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Verify Your Email Address
          </DialogTitle>
          <DialogDescription>
            We've sent a verification link to your email address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Address Display */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Email Address
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {email}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getEmailProvider(email)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Check your email inbox</p>
                  <p className="text-xs text-gray-500">
                    Look for an email from Business Services Hub
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Click the verification link</p>
                  <p className="text-xs text-gray-500">
                    This will activate your account
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Return to complete setup</p>
                  <p className="text-xs text-gray-500">
                    You'll be redirected to complete your profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Indicators */}
          <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Email verification pending
              </p>
              <p className="text-xs text-yellow-600">
                Check your email and click the verification link
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={isResending || resendCount >= 3}
              className="flex-1"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Email
                </>
              )}
            </Button>
            
            <Button
              onClick={() => window.open(`https://${getEmailProvider(email).toLowerCase().replace(' ', '')}.com`, '_blank')}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Email
            </Button>
          </div>

          {/* Resend Counter */}
          {resendCount > 0 && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Resend attempts: {resendCount}/3
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={handleResendEmail}
                disabled={isResending || resendCount >= 3}
                className="text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
              >
                resend verification email
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
