'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, 
  Lightbulb, 
  Zap, 
  Rocket, 
  Brain, 
  Sparkles,
  Code,
  Palette,
  Globe,
  Shield,
  Database,
  Smartphone,
  X,
  Clock
} from 'lucide-react'

interface SmartMilestoneTemplatesProps {
  onSelectTemplate?: (template: MilestoneTemplate) => void
  onTemplateSelect?: (template: any) => void
  onCancel: () => void
  bookingId?: string
  projectType?: string
}

interface MilestoneTemplate {
  id: string
  name: string
  description: string
  category: 'development' | 'design' | 'marketing' | 'business' | 'ecommerce' | 'consulting' | 'content' | 'analytics' | 'custom'
  icon: any
  milestones: {
    title: string
    description: string
    estimatedDays: number
    priority: 'low' | 'normal' | 'high' | 'urgent'
    tasks: {
      title: string
      description: string
      estimated_hours: number
      priority: 'low' | 'normal' | 'high' | 'urgent'
    }[]
  }[]
  tags: string[]
  estimatedDuration: string
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
  serviceType: 'one_time' | 'monthly' | 'quarterly' | 'yearly'
  priceRange: 'budget' | 'standard' | 'premium' | 'enterprise'
}

const templates: MilestoneTemplate[] = [
  {
    id: 'web-development',
    name: 'Web Development Project',
    description: 'Complete web application development with modern tech stack',
    category: 'development',
    icon: Code,
    estimatedDuration: '8-12 weeks',
    complexity: 'moderate',
    serviceType: 'one_time',
    priceRange: 'standard',
    tags: ['Frontend', 'Backend', 'Database', 'Testing'],
    milestones: [
      {
        title: 'Project Planning & Setup',
        description: 'Initial project setup, requirements gathering, and tech stack selection',
        estimatedDays: 7,
        priority: 'high',
        tasks: [
          { title: 'Requirements analysis', description: 'Gather and document all requirements', estimated_hours: 8, priority: 'high' },
          { title: 'Tech stack selection', description: 'Choose appropriate technologies', estimated_hours: 4, priority: 'normal' },
          { title: 'Project setup', description: 'Initialize repository and development environment', estimated_hours: 6, priority: 'high' },
          { title: 'Database design', description: 'Design database schema and relationships', estimated_hours: 8, priority: 'high' }
        ]
      },
      {
        title: 'Frontend Development',
        description: 'User interface development and responsive design implementation',
        estimatedDays: 21,
        priority: 'high',
        tasks: [
          { title: 'UI/UX design implementation', description: 'Convert designs to responsive components', estimated_hours: 24, priority: 'high' },
          { title: 'Component development', description: 'Build reusable UI components', estimated_hours: 20, priority: 'normal' },
          { title: 'State management setup', description: 'Implement state management solution', estimated_hours: 12, priority: 'normal' },
          { title: 'API integration', description: 'Connect frontend to backend APIs', estimated_hours: 16, priority: 'high' }
        ]
      },
      {
        title: 'Backend Development',
        description: 'Server-side logic, APIs, and database implementation',
        estimatedDays: 18,
        priority: 'high',
        tasks: [
          { title: 'API development', description: 'Build RESTful APIs and endpoints', estimated_hours: 20, priority: 'high' },
          { title: 'Database implementation', description: 'Set up database and migrations', estimated_hours: 12, priority: 'high' },
          { title: 'Authentication system', description: 'Implement user authentication and authorization', estimated_hours: 16, priority: 'high' },
          { title: 'Security measures', description: 'Implement security best practices', estimated_hours: 8, priority: 'normal' }
        ]
      },
      {
        title: 'Testing & Deployment',
        description: 'Quality assurance, testing, and production deployment',
        estimatedDays: 10,
        priority: 'normal',
        tasks: [
          { title: 'Unit testing', description: 'Write and execute unit tests', estimated_hours: 16, priority: 'normal' },
          { title: 'Integration testing', description: 'Test system integration', estimated_hours: 12, priority: 'normal' },
          { title: 'Performance optimization', description: 'Optimize application performance', estimated_hours: 8, priority: 'low' },
          { title: 'Production deployment', description: 'Deploy to production environment', estimated_hours: 6, priority: 'high' }
        ]
      }
    ]
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Development',
    description: 'Cross-platform mobile application development',
    category: 'development',
    icon: Smartphone,
    estimatedDuration: '10-14 weeks',
    complexity: 'complex',
    serviceType: 'one_time',
    priceRange: 'premium',
    tags: ['Mobile', 'Cross-platform', 'UI/UX', 'API'],
    milestones: [
      {
        title: 'App Planning & Design',
        description: 'User research, wireframing, and design system creation',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'User research', description: 'Conduct user interviews and surveys', estimated_hours: 12, priority: 'high' },
          { title: 'Wireframing', description: 'Create app wireframes and user flows', estimated_hours: 16, priority: 'high' },
          { title: 'Design system', description: 'Develop consistent design language', estimated_hours: 20, priority: 'normal' },
          { title: 'Prototype development', description: 'Create interactive prototype', estimated_hours: 12, priority: 'normal' }
        ]
      },
      {
        title: 'Core App Development',
        description: 'Main application features and functionality',
        estimatedDays: 28,
        priority: 'high',
        tasks: [
          { title: 'Navigation setup', description: 'Implement app navigation structure', estimated_hours: 8, priority: 'high' },
          { title: 'Core features', description: 'Develop main application features', estimated_hours: 40, priority: 'high' },
          { title: 'Data management', description: 'Implement local and remote data handling', estimated_hours: 16, priority: 'normal' },
          { title: 'Push notifications', description: 'Set up push notification system', estimated_hours: 12, priority: 'low' }
        ]
      },
      {
        title: 'Testing & Polish',
        description: 'Quality assurance and app store preparation',
        estimatedDays: 14,
        priority: 'normal',
        tasks: [
          { title: 'Device testing', description: 'Test on multiple devices and screen sizes', estimated_hours: 20, priority: 'high' },
          { title: 'Performance optimization', description: 'Optimize app performance and loading times', estimated_hours: 12, priority: 'normal' },
          { title: 'App store preparation', description: 'Prepare app store listings and assets', estimated_hours: 8, priority: 'normal' },
          { title: 'Beta testing', description: 'Conduct beta testing with users', estimated_hours: 16, priority: 'high' }
        ]
      }
    ]
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing Campaign',
    description: 'Comprehensive digital marketing strategy and execution',
    category: 'marketing',
    icon: Globe,
    estimatedDuration: '6-8 weeks',
    complexity: 'moderate',
    serviceType: 'monthly',
    priceRange: 'standard',
    tags: ['SEO', 'Social Media', 'Content', 'Analytics'],
    milestones: [
      {
        title: 'Strategy & Planning',
        description: 'Market research, strategy development, and campaign planning',
        estimatedDays: 7,
        priority: 'high',
        tasks: [
          { title: 'Market research', description: 'Analyze target market and competitors', estimated_hours: 12, priority: 'high' },
          { title: 'Strategy development', description: 'Create comprehensive marketing strategy', estimated_hours: 10, priority: 'high' },
          { title: 'Content calendar', description: 'Plan content schedule and themes', estimated_hours: 6, priority: 'normal' },
          { title: 'Budget allocation', description: 'Allocate budget across channels', estimated_hours: 4, priority: 'normal' }
        ]
      },
      {
        title: 'Content Creation',
        description: 'Develop engaging content for all marketing channels',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Blog content', description: 'Write SEO-optimized blog posts', estimated_hours: 16, priority: 'high' },
          { title: 'Social media content', description: 'Create social media posts and graphics', estimated_hours: 20, priority: 'high' },
          { title: 'Video content', description: 'Produce promotional videos', estimated_hours: 24, priority: 'normal' },
          { title: 'Email campaigns', description: 'Design email marketing campaigns', estimated_hours: 12, priority: 'normal' }
        ]
      },
      {
        title: 'Campaign Launch',
        description: 'Execute marketing campaigns across all channels',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'SEO optimization', description: 'Optimize website for search engines', estimated_hours: 16, priority: 'high' },
          { title: 'Social media launch', description: 'Launch social media campaigns', estimated_hours: 8, priority: 'high' },
          { title: 'Paid advertising', description: 'Set up and launch paid ad campaigns', estimated_hours: 12, priority: 'normal' },
          { title: 'Influencer outreach', description: 'Connect with relevant influencers', estimated_hours: 10, priority: 'low' }
        ]
      },
      {
        title: 'Analytics & Optimization',
        description: 'Monitor performance and optimize campaigns',
        estimatedDays: 7,
        priority: 'normal',
        tasks: [
          { title: 'Analytics setup', description: 'Configure tracking and analytics', estimated_hours: 6, priority: 'high' },
          { title: 'Performance monitoring', description: 'Monitor campaign performance daily', estimated_hours: 14, priority: 'normal' },
          { title: 'A/B testing', description: 'Test different campaign variations', estimated_hours: 8, priority: 'normal' },
          { title: 'Optimization', description: 'Optimize based on performance data', estimated_hours: 10, priority: 'high' }
        ]
      }
    ]
  },
  {
    id: 'business-consulting',
    name: 'Business Strategy Consulting',
    description: 'Comprehensive business analysis and strategic planning',
    category: 'business',
    icon: Brain,
    estimatedDuration: '4-6 weeks',
    complexity: 'simple',
    serviceType: 'quarterly',
    priceRange: 'premium',
    tags: ['Strategy', 'Analysis', 'Planning', 'Optimization'],
    milestones: [
      {
        title: 'Business Analysis',
        description: 'Comprehensive analysis of current business state',
        estimatedDays: 10,
        priority: 'high',
        tasks: [
          { title: 'Current state assessment', description: 'Analyze current business operations', estimated_hours: 12, priority: 'high' },
          { title: 'SWOT analysis', description: 'Identify strengths, weaknesses, opportunities, threats', estimated_hours: 8, priority: 'high' },
          { title: 'Financial review', description: 'Review financial performance and metrics', estimated_hours: 10, priority: 'normal' },
          { title: 'Market positioning', description: 'Analyze market position and competition', estimated_hours: 8, priority: 'normal' }
        ]
      },
      {
        title: 'Strategy Development',
        description: 'Create comprehensive business strategy and roadmap',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Strategic planning', description: 'Develop long-term business strategy', estimated_hours: 16, priority: 'high' },
          { title: 'Goal setting', description: 'Define SMART goals and KPIs', estimated_hours: 6, priority: 'high' },
          { title: 'Resource planning', description: 'Plan resource allocation and requirements', estimated_hours: 8, priority: 'normal' },
          { title: 'Risk assessment', description: 'Identify and plan for potential risks', estimated_hours: 6, priority: 'normal' }
        ]
      },
      {
        title: 'Implementation Planning',
        description: 'Create detailed implementation plan and timeline',
        estimatedDays: 7,
        priority: 'normal',
        tasks: [
          { title: 'Action plan creation', description: 'Create detailed step-by-step action plan', estimated_hours: 10, priority: 'high' },
          { title: 'Timeline development', description: 'Develop realistic implementation timeline', estimated_hours: 6, priority: 'normal' },
          { title: 'Success metrics', description: 'Define success metrics and measurement methods', estimated_hours: 4, priority: 'normal' },
          { title: 'Review and refinement', description: 'Review plan with stakeholders and refine', estimated_hours: 6, priority: 'high' }
        ]
      }
    ]
  },
  // E-commerce Templates
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store Setup',
    description: 'Complete online store development with payment integration',
    category: 'ecommerce',
    icon: Database,
    estimatedDuration: '6-10 weeks',
    complexity: 'moderate',
    serviceType: 'one_time',
    priceRange: 'standard',
    tags: ['E-commerce', 'Payment', 'Inventory', 'SEO'],
    milestones: [
      {
        title: 'Store Planning & Design',
        description: 'Store structure, design, and user experience planning',
        estimatedDays: 10,
        priority: 'high',
        tasks: [
          { title: 'Store architecture', description: 'Plan store structure and navigation', estimated_hours: 8, priority: 'high' },
          { title: 'UI/UX design', description: 'Design store interface and user flows', estimated_hours: 16, priority: 'high' },
          { title: 'Product catalog setup', description: 'Plan product categories and attributes', estimated_hours: 6, priority: 'normal' },
          { title: 'Brand integration', description: 'Integrate brand identity and styling', estimated_hours: 8, priority: 'normal' }
        ]
      },
      {
        title: 'Store Development',
        description: 'Build core e-commerce functionality',
        estimatedDays: 21,
        priority: 'high',
        tasks: [
          { title: 'Product management', description: 'Build product catalog and management system', estimated_hours: 20, priority: 'high' },
          { title: 'Shopping cart', description: 'Implement cart and checkout functionality', estimated_hours: 16, priority: 'high' },
          { title: 'Payment integration', description: 'Integrate payment gateways', estimated_hours: 12, priority: 'high' },
          { title: 'User accounts', description: 'Build user registration and login system', estimated_hours: 10, priority: 'normal' }
        ]
      },
      {
        title: 'Testing & Launch',
        description: 'Quality assurance and store launch',
        estimatedDays: 7,
        priority: 'normal',
        tasks: [
          { title: 'Payment testing', description: 'Test all payment methods and flows', estimated_hours: 8, priority: 'high' },
          { title: 'Performance optimization', description: 'Optimize store speed and performance', estimated_hours: 6, priority: 'normal' },
          { title: 'SEO setup', description: 'Configure SEO and meta tags', estimated_hours: 4, priority: 'normal' },
          { title: 'Launch preparation', description: 'Final testing and launch checklist', estimated_hours: 6, priority: 'high' }
        ]
      }
    ]
  },
  // Content Creation Templates
  {
    id: 'content-strategy',
    name: 'Content Marketing Strategy',
    description: 'Comprehensive content creation and marketing strategy',
    category: 'content',
    icon: Palette,
    estimatedDuration: '4-6 weeks',
    complexity: 'moderate',
    serviceType: 'monthly',
    priceRange: 'standard',
    tags: ['Content', 'SEO', 'Social Media', 'Blog'],
    milestones: [
      {
        title: 'Content Audit & Strategy',
        description: 'Analyze existing content and develop strategy',
        estimatedDays: 7,
        priority: 'high',
        tasks: [
          { title: 'Content audit', description: 'Review existing content and identify gaps', estimated_hours: 8, priority: 'high' },
          { title: 'Strategy development', description: 'Create content marketing strategy', estimated_hours: 10, priority: 'high' },
          { title: 'Content calendar', description: 'Plan content schedule and themes', estimated_hours: 6, priority: 'normal' },
          { title: 'SEO research', description: 'Research keywords and topics', estimated_hours: 8, priority: 'high' }
        ]
      },
      {
        title: 'Content Creation',
        description: 'Create high-quality content across channels',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Blog content', description: 'Write SEO-optimized blog posts', estimated_hours: 20, priority: 'high' },
          { title: 'Social media content', description: 'Create engaging social media posts', estimated_hours: 16, priority: 'high' },
          { title: 'Visual content', description: 'Create graphics and visual assets', estimated_hours: 12, priority: 'normal' },
          { title: 'Video content', description: 'Produce video content for various platforms', estimated_hours: 18, priority: 'normal' }
        ]
      },
      {
        title: 'Distribution & Optimization',
        description: 'Distribute content and optimize performance',
        estimatedDays: 7,
        priority: 'normal',
        tasks: [
          { title: 'Content distribution', description: 'Publish and promote content across channels', estimated_hours: 8, priority: 'high' },
          { title: 'Performance tracking', description: 'Monitor content performance and engagement', estimated_hours: 6, priority: 'normal' },
          { title: 'Optimization', description: 'Optimize content based on performance data', estimated_hours: 8, priority: 'normal' },
          { title: 'Reporting', description: 'Create content performance reports', estimated_hours: 4, priority: 'low' }
        ]
      }
    ]
  },
  // Analytics Templates
  {
    id: 'analytics-setup',
    name: 'Analytics & Reporting Setup',
    description: 'Comprehensive analytics implementation and reporting system',
    category: 'analytics',
    icon: Shield,
    estimatedDuration: '3-4 weeks',
    complexity: 'moderate',
    serviceType: 'monthly',
    priceRange: 'standard',
    tags: ['Analytics', 'Reporting', 'Data', 'Insights'],
    milestones: [
      {
        title: 'Analytics Planning',
        description: 'Plan analytics implementation and reporting needs',
        estimatedDays: 5,
        priority: 'high',
        tasks: [
          { title: 'Requirements analysis', description: 'Identify analytics and reporting requirements', estimated_hours: 6, priority: 'high' },
          { title: 'Tool selection', description: 'Select appropriate analytics tools', estimated_hours: 4, priority: 'high' },
          { title: 'KPI definition', description: 'Define key performance indicators', estimated_hours: 6, priority: 'high' },
          { title: 'Data mapping', description: 'Map data sources and flows', estimated_hours: 4, priority: 'normal' }
        ]
      },
      {
        title: 'Implementation',
        description: 'Set up analytics tools and tracking',
        estimatedDays: 10,
        priority: 'high',
        tasks: [
          { title: 'Tracking setup', description: 'Implement tracking codes and events', estimated_hours: 12, priority: 'high' },
          { title: 'Dashboard creation', description: 'Create analytics dashboards', estimated_hours: 16, priority: 'high' },
          { title: 'Report automation', description: 'Set up automated reporting', estimated_hours: 8, priority: 'normal' },
          { title: 'Data validation', description: 'Validate data accuracy and completeness', estimated_hours: 6, priority: 'high' }
        ]
      },
      {
        title: 'Training & Optimization',
        description: 'Train team and optimize analytics setup',
        estimatedDays: 5,
        priority: 'normal',
        tasks: [
          { title: 'Team training', description: 'Train team on analytics tools and reports', estimated_hours: 6, priority: 'normal' },
          { title: 'Process documentation', description: 'Document analytics processes and procedures', estimated_hours: 4, priority: 'low' },
          { title: 'Performance optimization', description: 'Optimize analytics performance', estimated_hours: 4, priority: 'low' },
          { title: 'Continuous improvement', description: 'Set up continuous improvement processes', estimated_hours: 6, priority: 'normal' }
        ]
      }
    ]
  },
  // Consulting Templates
  {
    id: 'digital-transformation',
    name: 'Digital Transformation Consulting',
    description: 'Guide businesses through digital transformation process',
    category: 'consulting',
    icon: Zap,
    estimatedDuration: '8-12 weeks',
    complexity: 'enterprise',
    serviceType: 'quarterly',
    priceRange: 'enterprise',
    tags: ['Transformation', 'Strategy', 'Technology', 'Change Management'],
    milestones: [
      {
        title: 'Assessment & Planning',
        description: 'Assess current state and plan transformation',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Current state analysis', description: 'Analyze current digital capabilities', estimated_hours: 20, priority: 'high' },
          { title: 'Gap analysis', description: 'Identify gaps and opportunities', estimated_hours: 16, priority: 'high' },
          { title: 'Transformation roadmap', description: 'Create detailed transformation roadmap', estimated_hours: 18, priority: 'high' },
          { title: 'Stakeholder alignment', description: 'Align stakeholders on transformation goals', estimated_hours: 12, priority: 'high' }
        ]
      },
      {
        title: 'Implementation Planning',
        description: 'Plan detailed implementation strategy',
        estimatedDays: 21,
        priority: 'high',
        tasks: [
          { title: 'Technology selection', description: 'Select appropriate technologies and tools', estimated_hours: 16, priority: 'high' },
          { title: 'Change management plan', description: 'Develop change management strategy', estimated_hours: 20, priority: 'high' },
          { title: 'Training programs', description: 'Design training and development programs', estimated_hours: 18, priority: 'normal' },
          { title: 'Risk mitigation', description: 'Identify and plan for implementation risks', estimated_hours: 12, priority: 'high' }
        ]
      },
      {
        title: 'Execution & Monitoring',
        description: 'Execute transformation and monitor progress',
        estimatedDays: 14,
        priority: 'normal',
        tasks: [
          { title: 'Implementation support', description: 'Support implementation execution', estimated_hours: 20, priority: 'high' },
          { title: 'Progress monitoring', description: 'Monitor transformation progress', estimated_hours: 12, priority: 'normal' },
          { title: 'Issue resolution', description: 'Address implementation issues', estimated_hours: 16, priority: 'high' },
          { title: 'Success measurement', description: 'Measure transformation success', estimated_hours: 8, priority: 'normal' }
        ]
      }
    ]
  },
  // Design Templates
  {
    id: 'brand-identity',
    name: 'Brand Identity Design',
    description: 'Complete brand identity design and guidelines',
    category: 'design',
    icon: Palette,
    estimatedDuration: '3-4 weeks',
    complexity: 'moderate',
    serviceType: 'one_time',
    priceRange: 'standard',
    tags: ['Branding', 'Logo', 'Design', 'Guidelines'],
    milestones: [
      {
        title: 'Brand Discovery',
        description: 'Research and understand brand requirements',
        estimatedDays: 5,
        priority: 'high',
        tasks: [
          { title: 'Brand research', description: 'Research brand values and positioning', estimated_hours: 8, priority: 'high' },
          { title: 'Competitor analysis', description: 'Analyze competitor branding', estimated_hours: 6, priority: 'high' },
          { title: 'Target audience', description: 'Define target audience and personas', estimated_hours: 6, priority: 'high' },
          { title: 'Brand strategy', description: 'Develop brand strategy and positioning', estimated_hours: 8, priority: 'high' }
        ]
      },
      {
        title: 'Design Development',
        description: 'Create brand identity elements',
        estimatedDays: 10,
        priority: 'high',
        tasks: [
          { title: 'Logo design', description: 'Create primary and secondary logos', estimated_hours: 16, priority: 'high' },
          { title: 'Color palette', description: 'Develop brand color palette', estimated_hours: 6, priority: 'high' },
          { title: 'Typography', description: 'Select and customize brand typography', estimated_hours: 8, priority: 'normal' },
          { title: 'Visual elements', description: 'Create supporting visual elements', estimated_hours: 12, priority: 'normal' }
        ]
      },
      {
        title: 'Brand Guidelines',
        description: 'Create comprehensive brand guidelines',
        estimatedDays: 5,
        priority: 'normal',
        tasks: [
          { title: 'Guidelines document', description: 'Create brand guidelines document', estimated_hours: 12, priority: 'high' },
          { title: 'Usage examples', description: 'Create usage examples and applications', estimated_hours: 8, priority: 'normal' },
          { title: 'Asset delivery', description: 'Prepare and deliver brand assets', estimated_hours: 6, priority: 'high' },
          { title: 'Presentation', description: 'Present brand identity to stakeholders', estimated_hours: 4, priority: 'normal' }
        ]
      }
    ]
  }
]

export function SmartMilestoneTemplates({ onSelectTemplate, onTemplateSelect, onCancel, bookingId, projectType }: SmartMilestoneTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showPreview, setShowPreview] = useState<boolean>(false)

  const categories = [
    { id: 'all', name: 'All Templates', icon: Sparkles },
    { id: 'development', name: 'Development', icon: Code },
    { id: 'design', name: 'Design', icon: Palette },
    { id: 'marketing', name: 'Marketing', icon: Globe },
    { id: 'business', name: 'Business', icon: Brain },
    { id: 'ecommerce', name: 'E-commerce', icon: Database },
    { id: 'consulting', name: 'Consulting', icon: Zap },
    { id: 'content', name: 'Content', icon: Palette },
    { id: 'analytics', name: 'Analytics', icon: Shield },
    { id: 'custom', name: 'Custom', icon: Target }
  ]


  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'complex': return 'bg-orange-100 text-orange-800'
      case 'enterprise': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter templates based on category and search query
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      (template.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="bg-white w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg w-10 h-10 flex items-center justify-center shadow-sm">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Milestone Templates</h2>
              <p className="text-sm text-muted-foreground">
                Choose a template to get started quickly
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Target className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Filter by Category</h3>
            <span className="text-sm text-gray-500">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const count = templates.filter(t => category.id === 'all' || t.category === category.id).length
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 text-sm transition-all ${
                    selectedCategory === category.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  <category.icon className="h-4 w-4" />
                  {category.name}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    selectedCategory === category.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`group relative rounded-xl border-2 bg-white hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden ${
                selectedTemplate === template.id 
                  ? "border-blue-500 shadow-lg ring-2 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {/* Card Header with Gradient */}
              <div className="relative p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl shadow-sm ${
                      selectedTemplate === template.id 
                        ? 'bg-blue-100' 
                        : 'bg-gray-100 group-hover:bg-blue-50'
                    }`}>
                      <template.icon className={`w-6 h-6 ${
                        selectedTemplate === template.id 
                          ? 'text-blue-600' 
                          : 'text-gray-600 group-hover:text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {template.category}
                      </p>
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  {selectedTemplate === template.id && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
                  {template.description}
                </p>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{template.milestones.length} phases</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{template.estimatedDuration}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-2 py-1 font-medium ${
                      getComplexityColor(template.complexity)
                    }`}
                  >
                    {template.complexity}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-1 font-medium">
                    {template.serviceType}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-1 font-medium">
                    {template.priceRange}
                  </Badge>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button 
                    className={`text-sm font-medium transition-colors ${
                      selectedTemplate === template.id
                        ? 'text-blue-600 hover:text-blue-700'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const templateData = templates.find(t => t.id === template.id)
                      if (templateData) {
                        if (onSelectTemplate) {
                          onSelectTemplate(templateData)
                        } else if (onTemplateSelect) {
                          onTemplateSelect(templateData)
                        }
                      }
                    }}
                  >
                    Use Template
                  </button>
                  
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPreview(!showPreview)
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Try selecting a different category'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-sm"
              >
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Selected Template</h4>
            </div>
            {(() => {
              const template = templates.find(t => t.id === selectedTemplate)
              if (!template) return null
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Phases included:</span>
                      <span className="text-sm font-semibold text-blue-600">{template.milestones.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estimated duration:</span>
                      <span className="text-sm font-semibold text-blue-600">{template.estimatedDuration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Complexity:</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getComplexityColor(template.complexity)}`}
                      >
                        {template.complexity}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Service type:</span>
                      <span className="text-sm font-medium">{template.serviceType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Price range:</span>
                      <span className="text-sm font-medium">{template.priceRange}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium capitalize">{template.category}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="text-sm font-medium px-6 py-2"
            >
              Cancel
            </Button>
            {selectedTemplate && (
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm font-medium px-6 py-2"
              >
                <Target className="h-4 w-4 mr-2" />
                Preview Details
              </Button>
            )}
          </div>
          
          {selectedTemplate && (
            <Button
              onClick={() => {
                const template = templates.find(t => t.id === selectedTemplate)
                if (template) {
                  if (onSelectTemplate) {
                    onSelectTemplate(template)
                  } else if (onTemplateSelect) {
                    onTemplateSelect(template)
                  }
                }
              }}
              className="text-sm font-medium px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Use This Template
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}