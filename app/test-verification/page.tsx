'use client'

import { VerificationStatusChecker } from '@/components/ui/verification-status-checker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'

export default function TestVerificationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Verification Test
          </h1>
          <p className="text-gray-600">
            Test and verify the email verification flow
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Checker */}
          <div>
            <VerificationStatusChecker />
          </div>

          {/* Test Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Test Instructions
                </CardTitle>
                <CardDescription>
                  Follow these steps to test email verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sign up with a test email</p>
                      <p className="text-xs text-gray-500">
                        Use a real email address you can access
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Check your email</p>
                      <p className="text-xs text-gray-500">
                        Look for verification email from Supabase
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Click verification link</p>
                      <p className="text-xs text-gray-500">
                        Verify you are redirected to onboarding
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Check status here</p>
                      <p className="text-xs text-gray-500">
                        Use the status checker to verify the process
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Email not received:</strong></p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Check spam/promotions folder</li>
                    <li>Verify email address is correct</li>
                    <li>Check Supabase email settings</li>
                  </ul>

                  <p><strong>Verification link not working:</strong></p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Link may have expired</li>
                    <li>Check redirect URL configuration</li>
                    <li>Try requesting a new verification email</li>
                  </ul>

                  <p><strong>User not redirected:</strong></p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Check profile creation trigger</li>
                    <li>Verify redirect URL is correct</li>
                    <li>Check for JavaScript errors</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Button asChild variant="outline">
                    <Link href="/auth/sign-up">
                      <Mail className="h-4 w-4 mr-2" />
                      Test Signup
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/auth/sign-in">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Test Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/auth/forgot-password">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Test Password Reset
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
