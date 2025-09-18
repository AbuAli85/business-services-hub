'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, User, Mail, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface VerificationStatus {
  exists: boolean
  verified: boolean
  hasProfile: boolean
  userId?: string
  email?: string
  createdAt?: string
  verifiedAt?: string
  profile?: {
    fullName: string
    role: string
    createdAt: string
  }
  message: string
}

export function VerificationStatusChecker() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<VerificationStatus | null>(null)

  const checkStatus = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/verification-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to check verification status')
      }

      const data = await response.json()
      setStatus(data)
      
      if (data.exists) {
        if (data.verified) {
          toast.success('Account is verified and ready to use')
        } else {
          toast.error('Account exists but email is not verified')
        }
      } else {
        toast('No account found with this email', { icon: 'ℹ️' })
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      toast.error('Failed to check verification status')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = () => {
    if (!status) return null
    
    if (!status.exists) {
      return <XCircle className="h-5 w-5 text-gray-400" />
    }
    
    if (status.verified) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    
    return <Clock className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = () => {
    if (!status) return null
    
    if (!status.exists) {
      return <Badge variant="secondary">Not Found</Badge>
    }
    
    if (status.verified) {
      return <Badge variant="default" className="bg-green-500">Verified</Badge>
    }
    
    return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending Verification</Badge>
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Verification Status Checker
        </CardTitle>
        <CardDescription>
          Check the verification status of any email address
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address to check"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && checkStatus()}
          />
          <Button 
            onClick={checkStatus} 
            disabled={loading}
            className="px-6"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </Button>
        </div>

        {status && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              {getStatusIcon()}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{status.email}</span>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-gray-600">{status.message}</p>
              </div>
            </div>

            {status.exists && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Account Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>User ID:</strong> {status.userId}</p>
                    <p><strong>Email:</strong> {status.email}</p>
                    <p><strong>Created:</strong> {status.createdAt && formatDate(status.createdAt)}</p>
                    {status.verifiedAt && (
                      <p><strong>Verified:</strong> {formatDate(status.verifiedAt)}</p>
                    )}
                  </div>
                </div>

                {status.profile && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile Details
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {status.profile.fullName}</p>
                      <p><strong>Role:</strong> {status.profile.role}</p>
                      <p><strong>Profile Created:</strong> {formatDate(status.profile.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {status.exists && !status.verified && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Next Steps</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Check your email for verification link</li>
                  <li>• Look in spam/promotions folder</li>
                  <li>• Click the verification link to activate your account</li>
                  <li>• Contact support if you need help</li>
                </ul>
              </div>
            )}

            {status.exists && status.verified && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Account Ready</h4>
                <p className="text-sm text-green-700">
                  Your account is verified and ready to use. You can now sign in to access your dashboard.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
