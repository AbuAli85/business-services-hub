'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Clock, 
  Users, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp
} from 'lucide-react'

interface SmartMilestoneTemplate {
  id: string
  name: string
  description: string
  category: string
  duration: string
  difficulty: 'easy' | 'medium' | 'hard'
  milestones: Array<{
    title: string
    description: string
    duration: string
    tasks: string[]
  }>
  icon: React.ComponentType<any>
  color: string
  popular?: boolean
}

interface SmartMilestoneTemplatesProps {
  bookingId: string
  onTemplateSelect: (template: SmartMilestoneTemplate) => void
  onCancel: () => void
}

const templates: SmartMilestoneTemplate[] = [
  {
    id: 'web-development',
    name: 'Web Development',
    description: 'Complete website development from design to deployment',
    category: 'Development',
    duration: '4-6 weeks',
    difficulty: 'medium',
    popular: true,
    icon: Target,
    color: 'bg-blue-500',
    milestones: [
      {
        title: 'Project Setup & Planning',
        description: 'Initialize project, set up development environment, and create project roadmap',
        duration: '3-5 days',
        tasks: [
          'Set up development environment',
          'Create project repository',
          'Define project requirements',
          'Create wireframes and mockups',
          'Set up project management tools'
        ]
      },
      {
        title: 'Frontend Development',
        description: 'Build user interface and user experience components',
        duration: '2-3 weeks',
        tasks: [
          'Create responsive layouts',
          'Implement user interface components',
          'Add interactive features',
          'Optimize for mobile devices',
          'Implement accessibility features'
        ]
      },
      {
        title: 'Backend Development',
        description: 'Develop server-side logic, APIs, and database integration',
        duration: '1-2 weeks',
        tasks: [
          'Set up backend architecture',
          'Create API endpoints',
          'Implement database models',
          'Add authentication system',
          'Set up data validation'
        ]
      },
      {
        title: 'Testing & Deployment',
        description: 'Test application thoroughly and deploy to production',
        duration: '3-5 days',
        tasks: [
          'Write and run unit tests',
          'Perform integration testing',
          'Fix bugs and issues',
          'Deploy to production',
          'Set up monitoring and analytics'
        ]
      }
    ]
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    description: 'Complete branding and design package for business',
    category: 'Design',
    duration: '2-3 weeks',
    difficulty: 'easy',
    popular: true,
    icon: Star,
    color: 'bg-purple-500',
    milestones: [
      {
        title: 'Brand Discovery',
        description: 'Understand brand values, target audience, and design requirements',
        duration: '2-3 days',
        tasks: [
          'Conduct brand discovery session',
          'Research target audience',
          'Analyze competitors',
          'Define brand personality',
          'Create mood boards'
        ]
      },
      {
        title: 'Logo Design',
        description: 'Create primary logo and variations',
        duration: '3-5 days',
        tasks: [
          'Sketch initial concepts',
          'Create digital logo designs',
          'Develop logo variations',
          'Create style guide',
          'Present logo options'
        ]
      },
      {
        title: 'Brand Identity',
        description: 'Develop complete brand identity system',
        duration: '1 week',
        tasks: [
          'Design business cards',
          'Create letterhead design',
          'Design social media templates',
          'Create brand guidelines',
          'Design marketing materials'
        ]
      },
      {
        title: 'Final Delivery',
        description: 'Prepare and deliver final design assets',
        duration: '2-3 days',
        tasks: [
          'Export final files',
          'Create usage guidelines',
          'Prepare presentation',
          'Deliver assets',
          'Provide brand training'
        ]
      }
    ]
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'Comprehensive digital marketing strategy and implementation',
    category: 'Marketing',
    duration: '6-8 weeks',
    difficulty: 'hard',
    icon: TrendingUp,
    color: 'bg-green-500',
    milestones: [
      {
        title: 'Strategy Development',
        description: 'Research market, analyze competitors, and develop marketing strategy',
        duration: '1 week',
        tasks: [
          'Conduct market research',
          'Analyze competitor strategies',
          'Define target audience',
          'Set marketing objectives',
          'Create content calendar'
        ]
      },
      {
        title: 'Content Creation',
        description: 'Create engaging content for all marketing channels',
        duration: '2-3 weeks',
        tasks: [
          'Write blog posts',
          'Create social media content',
          'Design visual assets',
          'Produce video content',
          'Develop email campaigns'
        ]
      },
      {
        title: 'Campaign Launch',
        description: 'Launch and monitor marketing campaigns across platforms',
        duration: '2-3 weeks',
        tasks: [
          'Set up advertising accounts',
          'Launch social media campaigns',
          'Start email marketing',
          'Monitor campaign performance',
          'Optimize based on data'
        ]
      },
      {
        title: 'Analysis & Optimization',
        description: 'Analyze results and optimize for better performance',
        duration: '1 week',
        tasks: [
          'Analyze campaign data',
          'Identify top performers',
          'Optimize underperforming campaigns',
          'Create performance report',
          'Plan next phase'
        ]
      }
    ]
  },
  {
    id: 'consulting',
    name: 'Business Consulting',
    description: 'Strategic business consulting and process improvement',
    category: 'Consulting',
    duration: '4-6 weeks',
    difficulty: 'hard',
    icon: Users,
    color: 'bg-orange-500',
    milestones: [
      {
        title: 'Assessment & Analysis',
        description: 'Analyze current business processes and identify improvement areas',
        duration: '1 week',
        tasks: [
          'Conduct business assessment',
          'Interview key stakeholders',
          'Analyze current processes',
          'Identify pain points',
          'Document findings'
        ]
      },
      {
        title: 'Strategy Development',
        description: 'Develop comprehensive improvement strategy and recommendations',
        duration: '1-2 weeks',
        tasks: [
          'Create improvement roadmap',
          'Develop implementation plan',
          'Create process documentation',
          'Design new workflows',
          'Prepare recommendations'
        ]
      },
      {
        title: 'Implementation Support',
        description: 'Support implementation of recommended changes',
        duration: '2-3 weeks',
        tasks: [
          'Train team members',
          'Monitor implementation',
          'Provide ongoing support',
          'Address challenges',
          'Track progress'
        ]
      },
      {
        title: 'Review & Optimization',
        description: 'Review results and optimize for continued success',
        duration: '3-5 days',
        tasks: [
          'Measure improvements',
          'Gather feedback',
          'Identify additional opportunities',
          'Create maintenance plan',
          'Deliver final report'
        ]
      }
    ]
  }
]

export function SmartMilestoneTemplates({ 
  bookingId, 
  onTemplateSelect, 
  onCancel 
}: SmartMilestoneTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SmartMilestoneTemplate | null>(null)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢'
      case 'medium': return '🟡'
      case 'hard': return '🔴'
      default: return '⚪'
    }
  }

  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setSelectedTemplate(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Templates
          </Button>
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${selectedTemplate.color}`}>
              <selectedTemplate.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h2>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Project Milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate.milestones.map((milestone, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {milestone.duration}
                  </Badge>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks:</h4>
                  <ul className="space-y-1">
                    {milestone.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-center space-x-2 text-sm text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex space-x-3">
          <Button
            onClick={() => onTemplateSelect(selectedTemplate)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Use This Template
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Project Template</h2>
        <p className="text-gray-600">
          Select a pre-built milestone template to get started quickly with your project
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const Icon = template.icon
          return (
            <Card 
              key={template.id}
              className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${template.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-600">{template.category}</p>
                    </div>
                  </div>
                  {template.popular && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{template.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{template.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-500">{getDifficultyIcon(template.difficulty)}</span>
                      <Badge className={getDifficultyColor(template.difficulty)}>
                        {template.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    {template.milestones.length} milestones
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full group"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTemplate(template)
                    }}
                  >
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
