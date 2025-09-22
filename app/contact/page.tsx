'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare, 
  Send,
  CheckCircle,
  Building2,
  Users,
  Headphones,
  Globe
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    inquiryType: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const inquiryTypes = [
    'General Inquiry',
    'Service Provider Registration',
    'Business Partnership',
    'Technical Support',
    'Billing Question',
    'Feedback',
    'Other'
  ]

  const subjects = [
    'I want to find a service provider',
    'I want to become a service provider',
    'I have a technical issue',
    'I want to partner with you',
    'I have a billing question',
    'I want to provide feedback',
    'Other'
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        subject: '',
        inquiryType: '',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Visit Our Office',
      details: 'Al Khuwair, Muscat\nSultanate of Oman',
      description: 'Come visit us at our headquarters in the heart of Muscat'
    },
    {
      icon: Phone,
      title: 'Call Us',
      details: '+968 2234 5678\n+968 9123 4567',
      description: 'Available Mon-Fri 9AM-6PM (GST)'
    },
    {
      icon: Mail,
      title: 'Email Us',
      details: 'hello@businesshub.com\nsupport@businesshub.com',
      description: 'We respond within 24 hours'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Sunday - Thursday\n9:00 AM - 6:00 PM',
      description: 'Gulf Standard Time (GST)'
    }
  ]

  const departments = [
    {
      icon: Users,
      title: 'Customer Support',
      email: 'support@businesshub.com',
      phone: '+968 2234 5678',
      description: 'General inquiries and account support'
    },
    {
      icon: Building2,
      title: 'Business Development',
      email: 'partnerships@businesshub.com',
      phone: '+968 2234 5679',
      description: 'Partnerships and business opportunities'
    },
    {
      icon: Headphones,
      title: 'Technical Support',
      email: 'tech@businesshub.com',
      phone: '+968 2234 5680',
      description: 'Technical issues and platform support'
    }
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="outline" onClick={() => router.back()} className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Message Sent Successfully!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for reaching out. We'll get back to you within 24 hours.
            </p>
            <Button onClick={() => setSubmitted(false)} className="btn-primary-gradient">
              Send Another Message
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Hero Section */}
        <div id="main-content" className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Get in Touch</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Have questions? Need help? We're here to assist you. Reach out to our team and we'll get back to you promptly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <Input 
                        id="full-name"
                        name="full-name"
                        placeholder="Your full name" 
                        value={formData.name} 
                        onChange={(e) => handleInputChange('name', e.target.value)} 
                        required 
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <Input 
                        id="email"
                        name="email"
                        type="email" 
                        placeholder="your.email@company.com" 
                        value={formData.email} 
                        onChange={(e) => handleInputChange('email', e.target.value)} 
                        required 
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      <Input 
                        id="company"
                        name="company"
                        placeholder="Your company name" 
                        value={formData.company} 
                        onChange={(e) => handleInputChange('company', e.target.value)} 
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <Input 
                        id="phone"
                        name="phone"
                        placeholder="+968 XXXX XXXX" 
                        value={formData.phone} 
                        onChange={(e) => handleInputChange('phone', e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="inquiry-type" className="block text-sm font-medium text-gray-700 mb-2">Inquiry Type *</label>
                      <Select value={formData.inquiryType} onValueChange={(value) => handleInputChange('inquiryType', value)}>
                        <SelectTrigger>
                          <SelectValue id="inquiry-type" placeholder="Select inquiry type" />
                        </SelectTrigger>
                        <SelectContent>
                          {inquiryTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                      <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                        <SelectTrigger>
                          <SelectValue id="subject" placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <Textarea 
                      id="message"
                      name="message"
                      placeholder="Please provide details about your inquiry..." 
                      value={formData.message} 
                      onChange={(e) => handleInputChange('message', e.target.value)} 
                      required 
                      aria-required="true"
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full btn-primary-gradient text-lg py-3"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Quick Contact Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Quick Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <info.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-line">{info.details}</p>
                      <p className="text-gray-500 text-xs mt-1">{info.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Departments */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Contact by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {departments.map((dept, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <dept.icon className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{dept.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{dept.description}</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">{dept.email}</p>
                      <p className="text-sm text-gray-500">{dept.phone}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-900 mb-2">Response Time</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    We typically respond to inquiries within 24 hours during business days.
                  </p>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Average: 4 hours
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">How do I register as a service provider?</h3>
                <p className="text-gray-600 text-sm">
                  Click on "Become a Provider" in the navigation menu, fill out the registration form, 
                  and our team will review your application within 2-3 business days.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">What are your service fees?</h3>
                <p className="text-gray-600 text-sm">
                  We charge a small commission only when you successfully complete a project. 
                  There are no upfront fees or monthly subscriptions for service providers.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">How do I find the right service provider?</h3>
                <p className="text-gray-600 text-sm">
                  Use our search and filter options to browse by category, price range, and location. 
                  All providers are verified and have customer reviews to help you make informed decisions.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">Is my payment secure?</h3>
                <p className="text-gray-600 text-sm">
                  Yes, we use industry-standard encryption and secure payment processing. 
                  Your payment is held in escrow until project completion to ensure satisfaction.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


