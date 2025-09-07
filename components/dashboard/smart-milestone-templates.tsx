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
  Smartphone
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
  category: 'development' | 'design' | 'marketing' | 'business' | 'custom'
  icon: any
  milestones: {
    title: string
    description: string
    estimatedDays: number
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tasks: {
      title: string
      description: string
      estimatedHours: number
      priority: 'low' | 'medium' | 'high' | 'urgent'
    }[]
  }[]
  tags: string[]
  estimatedDuration: string
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
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
    tags: ['Frontend', 'Backend', 'Database', 'Testing'],
    milestones: [
      {
        title: 'Project Planning & Setup',
        description: 'Initial project setup, requirements gathering, and tech stack selection',
        estimatedDays: 7,
        priority: 'high',
        tasks: [
          { title: 'Requirements analysis', description: 'Gather and document all requirements', estimatedHours: 8, priority: 'high' },
          { title: 'Tech stack selection', description: 'Choose appropriate technologies', estimatedHours: 4, priority: 'medium' },
          { title: 'Project setup', description: 'Initialize repository and development environment', estimatedHours: 6, priority: 'high' },
          { title: 'Database design', description: 'Design database schema and relationships', estimatedHours: 8, priority: 'high' }
        ]
      },
      {
        title: 'Frontend Development',
        description: 'User interface development and responsive design implementation',
        estimatedDays: 21,
        priority: 'high',
        tasks: [
          { title: 'UI/UX design implementation', description: 'Convert designs to responsive components', estimatedHours: 24, priority: 'high' },
          { title: 'Component development', description: 'Build reusable UI components', estimatedHours: 20, priority: 'medium' },
          { title: 'State management setup', description: 'Implement state management solution', estimatedHours: 12, priority: 'medium' },
          { title: 'API integration', description: 'Connect frontend to backend APIs', estimatedHours: 16, priority: 'high' }
        ]
      },
      {
        title: 'Backend Development',
        description: 'Server-side logic, APIs, and database implementation',
        estimatedDays: 18,
        priority: 'high',
        tasks: [
          { title: 'API development', description: 'Build RESTful APIs and endpoints', estimatedHours: 20, priority: 'high' },
          { title: 'Database implementation', description: 'Set up database and migrations', estimatedHours: 12, priority: 'high' },
          { title: 'Authentication system', description: 'Implement user authentication and authorization', estimatedHours: 16, priority: 'high' },
          { title: 'Security measures', description: 'Implement security best practices', estimatedHours: 8, priority: 'medium' }
        ]
      },
      {
        title: 'Testing & Deployment',
        description: 'Quality assurance, testing, and production deployment',
        estimatedDays: 10,
        priority: 'medium',
        tasks: [
          { title: 'Unit testing', description: 'Write and execute unit tests', estimatedHours: 16, priority: 'medium' },
          { title: 'Integration testing', description: 'Test system integration', estimatedHours: 12, priority: 'medium' },
          { title: 'Performance optimization', description: 'Optimize application performance', estimatedHours: 8, priority: 'low' },
          { title: 'Production deployment', description: 'Deploy to production environment', estimatedHours: 6, priority: 'high' }
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
    tags: ['Mobile', 'Cross-platform', 'UI/UX', 'API'],
    milestones: [
      {
        title: 'App Planning & Design',
        description: 'User research, wireframing, and design system creation',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'User research', description: 'Conduct user interviews and surveys', estimatedHours: 12, priority: 'high' },
          { title: 'Wireframing', description: 'Create app wireframes and user flows', estimatedHours: 16, priority: 'high' },
          { title: 'Design system', description: 'Develop consistent design language', estimatedHours: 20, priority: 'medium' },
          { title: 'Prototype development', description: 'Create interactive prototype', estimatedHours: 12, priority: 'medium' }
        ]
      },
      {
        title: 'Core App Development',
        description: 'Main application features and functionality',
        estimatedDays: 28,
        priority: 'high',
        tasks: [
          { title: 'Navigation setup', description: 'Implement app navigation structure', estimatedHours: 8, priority: 'high' },
          { title: 'Core features', description: 'Develop main application features', estimatedHours: 40, priority: 'high' },
          { title: 'Data management', description: 'Implement local and remote data handling', estimatedHours: 16, priority: 'medium' },
          { title: 'Push notifications', description: 'Set up push notification system', estimatedHours: 12, priority: 'low' }
        ]
      },
      {
        title: 'Testing & Polish',
        description: 'Quality assurance and app store preparation',
        estimatedDays: 14,
        priority: 'medium',
        tasks: [
          { title: 'Device testing', description: 'Test on multiple devices and screen sizes', estimatedHours: 20, priority: 'high' },
          { title: 'Performance optimization', description: 'Optimize app performance and loading times', estimatedHours: 12, priority: 'medium' },
          { title: 'App store preparation', description: 'Prepare app store listings and assets', estimatedHours: 8, priority: 'medium' },
          { title: 'Beta testing', description: 'Conduct beta testing with users', estimatedHours: 16, priority: 'high' }
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
    tags: ['SEO', 'Social Media', 'Content', 'Analytics'],
    milestones: [
      {
        title: 'Strategy & Planning',
        description: 'Market research, strategy development, and campaign planning',
        estimatedDays: 7,
        priority: 'high',
        tasks: [
          { title: 'Market research', description: 'Analyze target market and competitors', estimatedHours: 12, priority: 'high' },
          { title: 'Strategy development', description: 'Create comprehensive marketing strategy', estimatedHours: 10, priority: 'high' },
          { title: 'Content calendar', description: 'Plan content schedule and themes', estimatedHours: 6, priority: 'medium' },
          { title: 'Budget allocation', description: 'Allocate budget across channels', estimatedHours: 4, priority: 'medium' }
        ]
      },
      {
        title: 'Content Creation',
        description: 'Develop engaging content for all marketing channels',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Blog content', description: 'Write SEO-optimized blog posts', estimatedHours: 16, priority: 'high' },
          { title: 'Social media content', description: 'Create social media posts and graphics', estimatedHours: 20, priority: 'high' },
          { title: 'Video content', description: 'Produce promotional videos', estimatedHours: 24, priority: 'medium' },
          { title: 'Email campaigns', description: 'Design email marketing campaigns', estimatedHours: 12, priority: 'medium' }
        ]
      },
      {
        title: 'Campaign Launch',
        description: 'Execute marketing campaigns across all channels',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'SEO optimization', description: 'Optimize website for search engines', estimatedHours: 16, priority: 'high' },
          { title: 'Social media launch', description: 'Launch social media campaigns', estimatedHours: 8, priority: 'high' },
          { title: 'Paid advertising', description: 'Set up and launch paid ad campaigns', estimatedHours: 12, priority: 'medium' },
          { title: 'Influencer outreach', description: 'Connect with relevant influencers', estimatedHours: 10, priority: 'low' }
        ]
      },
      {
        title: 'Analytics & Optimization',
        description: 'Monitor performance and optimize campaigns',
        estimatedDays: 7,
        priority: 'medium',
        tasks: [
          { title: 'Analytics setup', description: 'Configure tracking and analytics', estimatedHours: 6, priority: 'high' },
          { title: 'Performance monitoring', description: 'Monitor campaign performance daily', estimatedHours: 14, priority: 'medium' },
          { title: 'A/B testing', description: 'Test different campaign variations', estimatedHours: 8, priority: 'medium' },
          { title: 'Optimization', description: 'Optimize based on performance data', estimatedHours: 10, priority: 'high' }
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
    tags: ['Strategy', 'Analysis', 'Planning', 'Optimization'],
    milestones: [
      {
        title: 'Business Analysis',
        description: 'Comprehensive analysis of current business state',
        estimatedDays: 10,
        priority: 'high',
        tasks: [
          { title: 'Current state assessment', description: 'Analyze current business operations', estimatedHours: 12, priority: 'high' },
          { title: 'SWOT analysis', description: 'Identify strengths, weaknesses, opportunities, threats', estimatedHours: 8, priority: 'high' },
          { title: 'Financial review', description: 'Review financial performance and metrics', estimatedHours: 10, priority: 'medium' },
          { title: 'Market positioning', description: 'Analyze market position and competition', estimatedHours: 8, priority: 'medium' }
        ]
      },
      {
        title: 'Strategy Development',
        description: 'Create comprehensive business strategy and roadmap',
        estimatedDays: 14,
        priority: 'high',
        tasks: [
          { title: 'Strategic planning', description: 'Develop long-term business strategy', estimatedHours: 16, priority: 'high' },
          { title: 'Goal setting', description: 'Define SMART goals and KPIs', estimatedHours: 6, priority: 'high' },
          { title: 'Resource planning', description: 'Plan resource allocation and requirements', estimatedHours: 8, priority: 'medium' },
          { title: 'Risk assessment', description: 'Identify and plan for potential risks', estimatedHours: 6, priority: 'medium' }
        ]
      },
      {
        title: 'Implementation Planning',
        description: 'Create detailed implementation plan and timeline',
        estimatedDays: 7,
        priority: 'medium',
        tasks: [
          { title: 'Action plan creation', description: 'Create detailed step-by-step action plan', estimatedHours: 10, priority: 'high' },
          { title: 'Timeline development', description: 'Develop realistic implementation timeline', estimatedHours: 6, priority: 'medium' },
          { title: 'Success metrics', description: 'Define success metrics and measurement methods', estimatedHours: 4, priority: 'medium' },
          { title: 'Review and refinement', description: 'Review plan with stakeholders and refine', estimatedHours: 6, priority: 'high' }
        ]
      }
    ]
  }
]

export function SmartMilestoneTemplates({ onSelectTemplate, onTemplateSelect, onCancel, bookingId, projectType }: SmartMilestoneTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const categories = [
    { id: 'all', name: 'All Templates', icon: Sparkles },
    { id: 'development', name: 'Development', icon: Code },
    { id: 'design', name: 'Design', icon: Palette },
    { id: 'marketing', name: 'Marketing', icon: Globe },
    { id: 'business', name: 'Business', icon: Brain },
    { id: 'custom', name: 'Custom', icon: Target }
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'complex': return 'bg-orange-100 text-orange-800'
      case 'enterprise': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          Smart Milestone Templates
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose from AI-powered templates tailored to your project type
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center gap-1 text-xs"
              >
                <category.icon className="h-3 w-3" />
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <template.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={getComplexityColor(template.complexity)}>
                            {template.complexity}
                          </Badge>
                          <Badge variant="outline">
                            {template.estimatedDuration}
                          </Badge>
                          <Badge variant="outline">
                            {template.milestones.length} phases
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <span 
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {selectedTemplate === template.id && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium text-sm mb-2">Included Phases:</h4>
                            <ul className="space-y-1">
                              {template.milestones.map((milestone, index) => (
                                <li key={index} className="text-xs text-gray-600 flex items-center gap-2">
                                  <Target className="h-3 w-3" />
                                  {milestone.title} ({milestone.tasks.length} tasks)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No templates found for this category</p>
                <p className="text-sm">Try selecting a different category</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Use This Template
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}