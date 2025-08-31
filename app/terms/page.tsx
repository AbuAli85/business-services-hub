'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/auth/sign-up">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign Up
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  By accessing and using Business Services Hub, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed">
                  Business Services Hub is a platform that connects business service providers with clients seeking professional services. 
                  We facilitate the connection but are not responsible for the quality of services provided by third-party providers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Providers:</strong> Must provide accurate information about their services, maintain professional standards, 
                    and fulfill their service commitments to clients.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Clients:</strong> Must provide accurate project requirements, communicate clearly with providers, 
                    and pay for services as agreed.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Payment and Fees</h2>
                <p className="text-gray-700 leading-relaxed">
                  All payments are processed through secure payment gateways. Service fees and payment terms are clearly 
                  communicated before service commencement. Refunds are subject to individual provider policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Privacy and Data Protection</h2>
                <p className="text-gray-700 leading-relaxed">
                  We are committed to protecting your privacy and personal information. Please refer to our Privacy Policy 
                  for detailed information about how we collect, use, and protect your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
                <p className="text-gray-700 leading-relaxed">
                  Business Services Hub acts as an intermediary platform. We are not liable for disputes between users, 
                  service quality issues, or any damages arising from the use of third-party services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right to terminate or suspend accounts that violate these terms, engage in fraudulent 
                  activities, or fail to maintain professional standards.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update these terms from time to time. Users will be notified of significant changes, 
                  and continued use of the platform constitutes acceptance of updated terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed">
                  For questions about these terms, please contact us at{' '}
                  <a href="mailto:support@businessserviceshub.com" className="text-blue-600 hover:underline">
                    support@businessserviceshub.com
                  </a>
                </p>
              </section>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-muted-foreground">
                  By using our services, you acknowledge that you have read, understood, and agree to these terms.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
