'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  Search, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  Video,
  FileText,
  ExternalLink,
  Send,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface FAQ {
  question: string
  answer: string
  category: string
}

interface SupportTicket {
  subject: string
  description: string
  priority: string
  category: string
}

const faqs: FAQ[] = [
  {
    question: "How do I create a new booking?",
    answer: "To create a new booking, navigate to the Services page, select a service you're interested in, choose a package, and click 'Book Now'. Fill in the required details including date, time, and any special requirements, then submit your booking.",
    category: "Bookings"
  },
  {
    question: "Can I cancel or modify my booking?",
    answer: "Yes, you can modify or cancel your booking depending on the service provider's cancellation policy. Go to your Bookings dashboard, select the booking you want to modify, and use the available actions. Note that some changes may be subject to fees or restrictions.",
    category: "Bookings"
  },
  {
    question: "How do I become a service provider?",
    answer: "To become a service provider, you need to sign up for an account and select 'Provider' as your role during registration. You'll then need to complete your profile, add services, and wait for approval from our team.",
    category: "Provider"
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and digital wallets like PayPal. All payments are processed securely through Stripe.",
    category: "Payments"
  },
  {
    question: "How do I contact customer support?",
    answer: "You can contact our support team through multiple channels: live chat on our website, email at support@businessserviceshub.com, or by submitting a support ticket through this help page.",
    category: "Support"
  },
  {
    question: "What happens if a service provider doesn't show up?",
    answer: "If a service provider doesn't show up for your scheduled appointment, contact our support team immediately. We'll help you reschedule or provide a refund according to our service guarantee policy.",
    category: "Bookings"
  },
  {
    question: "How do I leave a review?",
    answer: "After a service is completed, you'll receive an email invitation to leave a review. You can also go to your Bookings dashboard, find the completed booking, and click 'Leave Review' to rate your experience.",
    category: "Reviews"
  },
  {
    question: "Is my personal information secure?",
    answer: "Yes, we take data security seriously. All personal information is encrypted, and we follow industry best practices for data protection. We never share your personal information with third parties without your consent.",
    category: "Security"
  }
]

const categories = [
  "Bookings",
  "Provider", 
  "Payments",
  "Support",
  "Reviews",
  "Security",
  "Account",
  "Technical"
]

const priorities = [
  "Low",
  "Medium", 
  "High",
  "Urgent"
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedFAQs, setExpandedFAQs] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState('faq')
  const [supportTicket, setSupportTicket] = useState<SupportTicket>({
    subject: '',
    description: '',
    priority: 'Medium',
    category: 'General'
  })
  const [submitting, setSubmitting] = useState(false)

  const toggleFAQ = (index: number) => {
    const newExpanded = new Set(expandedFAQs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedFAQs(newExpanded)
  }

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = (faq.question || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (faq.answer || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset form
      setSupportTicket({
        subject: '',
        description: '',
        priority: 'Medium',
        category: 'General'
      })
      
      // Show success message (you can use toast here)
      alert('Support ticket submitted successfully! We\'ll get back to you within 24 hours.')
    } catch (error) {
      console.error('Error submitting ticket:', error)
      alert('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'contact', label: 'Contact Support', icon: MessageCircle },
    { id: 'resources', label: 'Resources', icon: BookOpen }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600 mt-2">Find answers to common questions and get help when you need it</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search FAQs</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search for answers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Results */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or category filter</p>
                </CardContent>
              </Card>
            ) : (
              filteredFAQs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 -m-2 rounded-md transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{faq.question}</h3>
                        <p className="text-sm text-gray-500 mt-1">{faq.category}</p>
                      </div>
                      {expandedFAQs.has(index) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    
                    {expandedFAQs.has(index) && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Still Need Help */}
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Still need help?</h3>
              <p className="text-gray-600 mb-4">Can't find what you're looking for? Contact our support team</p>
              <Button onClick={() => setActiveTab('contact')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Support Tab */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          {/* Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 mb-4">Get instant help from our support team</p>
                <Button variant="outline" className="w-full">
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Email Support</h3>
                <p className="text-gray-600 mb-4">Send us an email and we'll respond within 24 hours</p>
                <Button variant="outline" className="w-full">
                  <a href="mailto:support@businessserviceshub.com">Send Email</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Phone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Phone Support</h3>
                <p className="text-gray-600 mb-4">Call us for immediate assistance</p>
                <Button variant="outline" className="w-full">
                  <a href="tel:+1-800-123-4567">Call Now</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Support Ticket Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>Fill out the form below and we'll get back to you as soon as possible</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={supportTicket.category}
                      onValueChange={(value) => setSupportTicket(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Billing">Billing</SelectItem>
                        <SelectItem value="Account">Account</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={supportTicket.priority}
                      onValueChange={(value) => setSupportTicket(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={supportTicket.subject}
                    onChange={(e) => setSupportTicket(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide detailed information about your issue..."
                    value={supportTicket.description}
                    onChange={(e) => setSupportTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Response Time Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Response Times</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Urgent:</span> 2-4 hours • 
                    <span className="font-medium">High:</span> 4-8 hours • 
                    <span className="font-medium">Medium:</span> 8-24 hours • 
                    <span className="font-medium">Low:</span> 24-48 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Documentation & Guides</CardTitle>
              <CardDescription>Comprehensive guides and tutorials to help you get the most out of our platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">Getting Started Guide</h4>
                  <p className="text-sm text-gray-600">Learn the basics of using our platform</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <BookOpen className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">Provider Handbook</h4>
                  <p className="text-sm text-gray-600">Complete guide for service providers</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <Video className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">Video Tutorials</h4>
                  <p className="text-sm text-gray-600">Step-by-step video guides</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 text-orange-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">API Documentation</h4>
                  <p className="text-sm text-gray-600">Technical documentation for developers</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <BookOpen className="h-8 w-8 text-red-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">Troubleshooting</h4>
                  <p className="text-sm text-gray-600">Common issues and solutions</p>
                </div>

                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <ExternalLink className="h-8 w-8 text-indigo-600 mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">External Resources</h4>
                  <p className="text-sm text-gray-600">Helpful links and references</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community & Updates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Forum</CardTitle>
                <CardDescription>Connect with other users and share experiences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Join our community forum to connect with other users</p>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Forum
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Updates</CardTitle>
                <CardDescription>Stay informed about new features and improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">New Booking System</p>
                      <p className="text-xs text-green-700">Enhanced booking experience with real-time updates</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Mobile App</p>
                      <p className="text-xs text-blue-700">Native mobile app now available for iOS and Android</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Payment Integration</p>
                      <p className="text-xs text-purple-700">New payment methods and improved security</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
