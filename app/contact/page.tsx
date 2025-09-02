'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Placeholder for integration; for now just acknowledge
      alert('Thanks for reaching out. We will get back to you shortly.')
      setName(''); setEmail(''); setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Textarea placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} required />
              <Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Message'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


