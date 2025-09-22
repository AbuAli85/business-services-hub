'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Users, 
  Shield, 
  Star, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Building2,
  Briefcase,
  Menu,
  X,
  Play,
  Quote,
  TrendingUp,
  Award,
  Globe,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ChevronRight,
  Zap,
  Target,
  Heart,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Skip Navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      {/* Enhanced Header */}
      <header className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient-primary">Business Services Hub</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/services" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Services
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Contact
              </Link>
              <div className="flex items-center space-x-4">
                <Link href="/auth/sign-in">
                  <Button variant="ghost" className="font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button className="btn-primary-gradient font-medium">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link
                  href="/services"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Services
                </Link>
                <Link
                  href="/about"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <div className="border-t border-gray-200 pt-3">
                  <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full btn-primary-gradient mt-2">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Enhanced Hero Section */}
      <section id="main-content" className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-16">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full opacity-20 blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              Trusted by 5000+ businesses in Oman
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Connect with Trusted
              <span className="text-gradient-primary block"> Business Services</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Find verified service providers in Oman for all your business needs. 
              From digital marketing to legal services, connect with professionals 
              who understand the local market and deliver quality results with guaranteed satisfaction.
            </p>
            
            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/services">
                <Button size="lg" className="btn-primary-gradient text-lg px-8 py-4 rounded-xl">
                  Browse Services
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl border-2">
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  Book a Consultation
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                <span>5000+ Happy Customers</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-500" aria-hidden="true" />
                <span>100% Verified Providers</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                <span>4.9/5 Average Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-gradient-primary">5000+</div>
              <div className="text-gray-600 font-medium">Happy Customers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-gradient-primary">800+</div>
              <div className="text-gray-600 font-medium">Verified Providers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-gradient-primary">15000+</div>
              <div className="text-gray-600 font-medium">Projects Completed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-gradient-primary">99%</div>
              <div className="text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-4">
              <Target className="h-4 w-4 mr-2" aria-hidden="true" />
              Why Choose Us
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              We make it easy to find and work with trusted business service providers who deliver exceptional results
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Shield className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl mb-3">Verified Providers</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  All providers are thoroughly verified and reviewed by our expert team to ensure quality and reliability
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-3">Quality Guaranteed</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Get the results you expect with our satisfaction guarantee or your money back - no questions asked
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-3">Fast Delivery</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Quick turnaround times with clear delivery schedules and milestone tracking for all projects
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-3">Expert Support</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  24/7 customer support from our dedicated team to help you succeed at every step of your journey
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-3">Trusted Reviews</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Read authentic reviews from real customers and make informed decisions based on proven track records
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated hover-lift border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-3">Business Focused</CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  Platform built specifically for business service needs with enterprise-grade security and compliance
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Services Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium mb-4">
              <Briefcase className="h-4 w-4 mr-2" />
              Popular Categories
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Most Requested Services
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the business services that companies trust most for their growth and success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Digital Marketing', slug: 'digital-marketing', count: '150+', color: 'from-blue-500 to-blue-600' },
              { name: 'Legal Services', slug: 'legal-services', count: '80+', color: 'from-green-500 to-green-600' },
              { name: 'Accounting', slug: 'accounting', count: '120+', color: 'from-purple-500 to-purple-600' },
              { name: 'IT Services', slug: 'it-services', count: '200+', color: 'from-orange-500 to-orange-600' },
              { name: 'Design & Branding', slug: 'design-branding', count: '180+', color: 'from-pink-500 to-pink-600' },
              { name: 'Consulting', slug: 'consulting', count: '90+', color: 'from-indigo-500 to-indigo-600' },
              { name: 'Translation', slug: 'translation', count: '60+', color: 'from-teal-500 to-teal-600' },
              { name: 'HR Services', slug: 'hr-services', count: '70+', color: 'from-red-500 to-red-600' },
            ].map((service) => (
              <Link key={service.name} href={`/services?category=${service.slug}`}>
                <Card className="card-elevated hover-lift border-0 cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Briefcase className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">{service.name}</h3>
                    <Badge className="badge-enhanced bg-gray-100 text-gray-800">{service.count} providers</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/services">
              <Button size="lg" className="btn-primary-gradient text-lg px-8 py-4 rounded-xl">
                View All Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-4">
              <Heart className="h-4 w-4 mr-2" />
              Customer Stories
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What Our Clients Say
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Don't just take our word for it - hear from the businesses that have transformed their operations with our platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Ahmed Al-Rashid",
                title: "CEO, TechStart Oman",
                company: "Technology Startup",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                content: "Business Services Hub helped us find the perfect digital marketing partner. Our online presence has grown by 300% in just 6 months! The local expertise made all the difference.",
                rating: 5,
                location: "Muscat, Oman"
              },
              {
                name: "Fatima Al-Zahra", 
                title: "Founder, Muscat Retail",
                company: "Retail Business",
                image: "https://images.unsplash.com/photo-1494790108755-2616b612b123?w=150&h=150&fit=crop&crop=face",
                content: "The quality of service providers is exceptional. We found our accounting firm here and they've been fantastic for our business growth. They understand Omani regulations perfectly.",
                rating: 5,
                location: "Muscat, Oman"
              },
              {
                name: "Omar Hassan",
                title: "Operations Manager, Gulf Logistics",
                company: "Logistics Company",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", 
                content: "Professional, reliable, and results-driven. The platform made it easy to connect with trusted legal advisors for our expansion across the GCC region.",
                rating: 5,
                location: "Salalah, Oman"
              },
              {
                name: "Sarah Al-Mansouri",
                title: "Marketing Director, Nizwa Trading",
                company: "Trading Company",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
                content: "Finding the right IT services provider was challenging until we discovered Business Services Hub. The verification process gave us confidence, and the results exceeded expectations.",
                rating: 5,
                location: "Nizwa, Oman"
              },
              {
                name: "Khalid Al-Balushi",
                title: "CEO, Sur Manufacturing",
                company: "Manufacturing",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
                content: "The platform's focus on local businesses in Oman is what sets it apart. We found HR services that understand our cultural context and business needs perfectly.",
                rating: 5,
                location: "Sur, Oman"
              },
              {
                name: "Aisha Al-Hinai",
                title: "Founder, Sohar Consulting",
                company: "Consulting Firm",
                image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
                content: "As a service provider on the platform, I've seen how it connects us with quality clients. The verification process ensures we work with serious businesses who value quality work.",
                rating: 5,
                location: "Sohar, Oman"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="card-glass border-0 hover-lift">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-blue-500 mb-4" />
                  <p className="text-gray-700 leading-relaxed mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.image}
                      alt={`${testimonial.name} - ${testimonial.title}`}
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.title}</div>
                      <div className="text-xs text-gray-500">{testimonial.location}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-4">
              <Award className="h-4 w-4 mr-2" />
              Success Stories
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Real Results from Oman Businesses
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              See how businesses across Oman have transformed their operations with our verified service providers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">TechStart Oman</h3>
                <p className="text-gray-600 mb-6">
                  A technology startup needed to establish their digital presence and scale their operations across the GCC region.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Services Used:</span>
                    <span className="text-sm font-medium">Digital Marketing, Legal Services</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Result:</span>
                    <span className="text-sm font-medium text-green-600">300% growth in 6 months</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm font-medium">Muscat, Oman</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Gulf Logistics</h3>
                <p className="text-gray-600 mb-6">
                  A logistics company needed legal expertise for international expansion and compliance with local regulations.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Services Used:</span>
                    <span className="text-sm font-medium">Legal Services, Consulting</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Result:</span>
                    <span className="text-sm font-medium text-green-600">Successful GCC expansion</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm font-medium">Salalah, Oman</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sur Manufacturing</h3>
                <p className="text-gray-600 mb-6">
                  A manufacturing company needed HR services that understand local culture and business practices.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Services Used:</span>
                    <span className="text-sm font-medium">HR Services, Consulting</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Result:</span>
                    <span className="text-sm font-medium text-green-600">50% reduction in turnover</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm font-medium">Sur, Oman</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join over 5,000 businesses in Oman who trust us to connect them with verified, professional service providers. 
              Start your journey to success today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 rounded-xl font-medium shadow-xl">
                  <Zap className="h-5 w-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-4 rounded-xl font-medium">
                  <Search className="h-5 w-5 mr-2" />
                  Browse Services
                </Button>
              </Link>
            </div>
            
            {/* Mini features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-blue-100">
              <div className="flex flex-col items-center">
                <CheckCircle className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">No Setup Fees</span>
              </div>
              <div className="flex flex-col items-center">
                <Shield className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">100% Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <Users className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Business Services Hub</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted platform for connecting with verified business service providers in Oman. 
                Quality, reliability, and results guaranteed.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <Facebook className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <Instagram className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
                  <Linkedin className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-3">
                <li><Link href="/services" className="text-gray-400 hover:text-white transition-colors">Browse All Services</Link></li>
                <li><Link href="/services?category=digital-marketing" className="text-gray-400 hover:text-white transition-colors">Digital Marketing</Link></li>
                <li><Link href="/services?category=legal" className="text-gray-400 hover:text-white transition-colors">Legal Services</Link></li>
                <li><Link href="/services?category=accounting" className="text-gray-400 hover:text-white transition-colors">Accounting</Link></li>
                <li><Link href="/services?category=it" className="text-gray-400 hover:text-white transition-colors">IT Services</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/press" className="text-gray-400 hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>

            {/* Contact & Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Get in Touch</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span>+968 2234 5678</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>hello@businesshub.com</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>Muscat, Oman</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Legal</h4>
                <ul className="space-y-1 text-sm">
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Business Services Hub. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Badge className="bg-green-100 text-green-800 text-xs">
                <Award className="h-3 w-3 mr-1" />
                ISO 27001 Certified
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                <Shield className="h-3 w-3 mr-1" />
                SSL Secured
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
