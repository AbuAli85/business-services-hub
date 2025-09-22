'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Building2, 
  Target, 
  Users, 
  Award, 
  Globe, 
  Heart, 
  Shield, 
  Star,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Facebook,
  Instagram
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()
  
  const teamMembers = [
    {
      name: "Ahmed Al-Rashid",
      role: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
      bio: "Former McKinsey consultant with 15+ years in business development across the GCC region.",
      linkedin: "#"
    },
    {
      name: "Fatima Al-Zahra",
      role: "Chief Technology Officer",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b123?w=300&h=300&fit=crop&crop=face",
      bio: "Tech entrepreneur and former Microsoft engineer specializing in scalable platform architecture.",
      linkedin: "#"
    },
    {
      name: "Omar Hassan",
      role: "Head of Operations",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
      bio: "Operations expert with extensive experience in service quality management and customer success.",
      linkedin: "#"
    },
    {
      name: "Sarah Al-Mansouri",
      role: "Head of Marketing",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
      bio: "Digital marketing strategist with a track record of growing businesses in the MENA region.",
      linkedin: "#"
    }
  ]

  const values = [
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "We believe in building lasting relationships through honest communication and transparent processes."
    },
    {
      icon: Target,
      title: "Quality Excellence",
      description: "Every service provider on our platform undergoes rigorous verification to ensure exceptional quality."
    },
    {
      icon: Users,
      title: "Community First",
      description: "We're committed to fostering a supportive ecosystem where businesses and service providers thrive together."
    },
    {
      icon: Globe,
      title: "Local Expertise",
      description: "Deep understanding of Oman's business landscape and cultural nuances to deliver relevant solutions."
    }
  ]

  const achievements = [
    { number: "5000+", label: "Happy Customers" },
    { number: "800+", label: "Verified Providers" },
    { number: "15000+", label: "Projects Completed" },
    { number: "99%", label: "Satisfaction Rate" }
  ]

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
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About Business Services Hub</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to transform how businesses in Oman connect with trusted service providers, 
            creating a more efficient and transparent marketplace for professional services.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-7 text-lg">
                To connect businesses with trusted service providers, enabling growth through 
                professional services, transparent pricing, and streamlined collaboration. We believe 
                every business deserves access to quality services that help them succeed and grow.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Our Vision</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-7 text-lg">
                To become the leading platform for business services in the GCC region, known for 
                our commitment to quality, innovation, and customer satisfaction. We envision a future 
                where finding the right service provider is effortless and reliable.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Story */}
        <Card className="border-0 shadow-lg mb-16">
          <CardHeader>
            <CardTitle className="text-3xl text-center mb-6">Our Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-8 mb-6">
                Founded in 2020 in Muscat, Oman, Business Services Hub was born from a simple observation: 
                businesses were struggling to find reliable, high-quality service providers in the local market. 
                Our founders, having experienced this challenge firsthand, set out to create a solution.
              </p>
              <p className="text-gray-700 leading-8 mb-6">
                What started as a small platform with a handful of verified providers has grown into Oman's 
                most trusted business services marketplace. Today, we serve over 5,000 businesses and work with 
                more than 800 verified service providers across 10+ categories.
              </p>
              <p className="text-gray-700 leading-8">
                Our success is built on three pillars: rigorous provider verification, transparent pricing, 
                and exceptional customer support. We're proud to have facilitated over 15,000 successful 
                projects and maintained a 99% customer satisfaction rate.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="border-0 shadow-lg text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{member.bio}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    <Linkedin className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Our Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{achievement.number}</div>
                <div className="text-blue-100 font-medium">{achievement.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl text-center mb-6">Get in Touch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Visit Us</h3>
                <p className="text-gray-600">Al Khuwair, Muscat<br />Sultanate of Oman</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
                <p className="text-gray-600">+968 2234 5678<br />Mon-Fri 9AM-6PM</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email Us</h3>
                <p className="text-gray-600">hello@businesshub.com<br />support@businesshub.com</p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <div className="flex justify-center space-x-4">
                <Button variant="outline" size="sm">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


