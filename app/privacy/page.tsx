'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
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
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Personal Information:</strong> We collect information you provide directly to us, such as your name, 
                    email address, phone number, company details, and professional credentials.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Service Information:</strong> Details about services you offer or seek, including descriptions, 
                    pricing, and availability.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Usage Data:</strong> Information about how you interact with our platform, including pages visited, 
                    features used, and time spent on the site.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Service Provision:</strong> To connect service providers with clients, process payments, 
                    and facilitate communication between users.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Platform Improvement:</strong> To analyze usage patterns, improve our services, 
                    and develop new features.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Communication:</strong> To send important updates, service notifications, and respond to your inquiries.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Security:</strong> To protect against fraud, abuse, and unauthorized access to our platform.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
                <p className="text-gray-700 leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. We may share information in the following circumstances:
                </p>
                <div className="space-y-3 mt-3">
                  <p className="text-gray-700 leading-relaxed">
                    • <strong>Service Providers:</strong> With trusted third-party services that help us operate our platform 
                    (payment processors, hosting providers, analytics services).
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    • <strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    • <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                <p className="text-gray-700 leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, 
                  and regular security assessments.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed">
                  We retain your personal information for as long as necessary to provide our services, comply with legal 
                  obligations, resolve disputes, and enforce our agreements. You may request deletion of your data, 
                  subject to certain legal and business requirements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Access:</strong> You can request a copy of the personal information we hold about you.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Correction:</strong> You can update or correct inaccurate information in your profile.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Deletion:</strong> You can request deletion of your personal information, subject to legal requirements.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Portability:</strong> You can request a copy of your data in a machine-readable format.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
                <p className="text-gray-700 leading-relaxed">
                  We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide 
                  personalized content. You can control cookie settings through your browser preferences.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our platform may contain links to third-party websites or services. We are not responsible for the privacy 
                  practices of these external sites. We encourage you to review their privacy policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
                <p className="text-gray-700 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate 
                  safeguards are in place to protect your data in accordance with applicable data protection laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our services are not intended for children under 18 years of age. We do not knowingly collect personal 
                  information from children under 18.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
                  the new policy on our platform and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have questions about this Privacy Policy or our data practices, please contact us at:{' '}
                  <a href="mailto:privacy@businessserviceshub.com" className="text-blue-600 hover:underline">
                    privacy@businessserviceshub.com
                  </a>
                </p>
              </section>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-muted-foreground">
                  By using our services, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
