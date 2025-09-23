'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, MessageSquare, Phone, WhatsApp } from 'lucide-react'

interface FormData {
  name: string
  email: string
  phone?: string
  company?: string
  service_category: string
  message: string
  preferred_channel: 'phone' | 'email' | 'whatsapp'
}

const categories = [
  'Digital Marketing',
  'Legal Services',
  'Accounting',
  'IT Services',
  'Design & Branding',
  'Consulting',
]

export default function ConsultationPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_category: '',
    message: '',
    preferred_channel: 'email',
  })

  const next = () => setStep((s) => Math.min(3, s + 1))
  const back = () => setStep((s) => Math.max(1, s - 1))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error(await res.text())
      setSubmitted(true)
    } catch (err) {
      console.error('Consultation submit failed', err)
      alert('Failed to submit. Please try again or use WhatsApp/phone below.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request received!</h1>
          <p className="text-gray-600 mb-6">Our team will contact you shortly via your preferred channel.</p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <a href="tel:+96822345678"><Phone className="h-4 w-4 mr-2" /> Call us</a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://wa.me/96891234567" target="_blank" rel="noopener noreferrer"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Book a Free Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+968 XXXX XXXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Category *</label>
                    <Select value={form.service_category} onValueChange={(v) => setForm({ ...form, service_category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">What do you need? *</label>
                    <Textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Briefly describe your needs, goals, and timeline." />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Channel *</label>
                    <Select value={form.preferred_channel} onValueChange={(v: any) => setForm({ ...form, preferred_channel: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={back} disabled={step === 1}>Back</Button>
                {step < 3 ? (
                  <Button type="button" onClick={next}>Next</Button>
                ) : (
                  <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
                )}
              </div>
            </form>

            <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
              <span>Prefer fast contact?</span>
              <a className="underline" href="tel:+96822345678">Call us</a>
              <span>•</span>
              <a className="underline" href="https://wa.me/96891234567" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


