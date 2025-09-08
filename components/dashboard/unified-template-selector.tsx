'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TemplateCard } from './template-card'
import { 
  Target, 
  CheckSquare, 
  Plus, 
  X, 
  Rocket,
  Palette,
  Code,
  Bug,
  CreditCard,
  MessageSquare,
  FileText,
  Zap,
  Brain,
  Globe,
  Database,
  Smartphone,
  Shield
} from 'lucide-react'

interface Template {
  id: string
  title: string
  description: string
  category: string
  icon: any
  type: 'milestone' | 'task'
  isCustom?: boolean
  defaultSteps?: any[]
  userId?: string
}

interface UnifiedTemplateSelectorProps {
  onSelectTemplate: (template: Template) => void
  onCancel: () => void
  userRole?: 'provider' | 'client'
  bookingId?: string
}

// System Milestone Templates
const systemMilestoneTemplates: Template[] = [
  {
    id: 'project-kickoff',
    title: 'Project Kickoff',
    description: 'Initial project setup, requirements gathering, and team alignment',
    category: 'Planning',
    icon: Rocket,
    type: 'milestone',
    defaultSteps: [
      { title: 'Initial meeting with client', description: 'Discuss project requirements and expectations' },
      { title: 'Project scope definition', description: 'Define deliverables and timeline' },
      { title: 'Team introduction', description: 'Introduce team members and roles' },
      { title: 'Tool setup', description: 'Set up project management and communication tools' }
    ]
  },
  {
    id: 'design-phase',
    title: 'Design Phase',
    description: 'Create wireframes, mockups, and design system',
    category: 'Design',
    icon: Palette,
    type: 'milestone',
    defaultSteps: [
      { title: 'Wireframe creation', description: 'Create low-fidelity wireframes' },
      { title: 'Visual design', description: 'Develop high-fidelity mockups' },
      { title: 'Design system', description: 'Create consistent design components' },
      { title: 'Client review', description: 'Present designs and gather feedback' }
    ]
  },
  {
    id: 'development-phase',
    title: 'Development Phase',
    description: 'Build core functionality and features',
    category: 'Development',
    icon: Code,
    type: 'milestone',
    defaultSteps: [
      { title: 'Environment setup', description: 'Set up development and staging environments' },
      { title: 'Core development', description: 'Build main application features' },
      { title: 'API integration', description: 'Connect frontend to backend services' },
      { title: 'Code review', description: 'Review code quality and standards' }
    ]
  },
  {
    id: 'testing-qa',
    title: 'Testing & QA',
    description: 'Quality assurance, bug fixes, and validation',
    category: 'Quality',
    icon: Shield,
    type: 'milestone',
    defaultSteps: [
      { title: 'Unit testing', description: 'Write and execute unit tests' },
      { title: 'Integration testing', description: 'Test system integration' },
      { title: 'User acceptance testing', description: 'Client testing and feedback' },
      { title: 'Bug fixes', description: 'Address identified issues' }
    ]
  },
  {
    id: 'delivery-handover',
    title: 'Delivery & Handover',
    description: 'Final delivery, documentation, and project handover',
    category: 'Delivery',
    icon: Target,
    type: 'milestone',
    defaultSteps: [
      { title: 'Final testing', description: 'Comprehensive system testing' },
      { title: 'Documentation', description: 'Create user and technical documentation' },
      { title: 'Deployment', description: 'Deploy to production environment' },
      { title: 'Training', description: 'Train client team on system usage' }
    ]
  }
]

// System Task Templates
const systemTaskTemplates: Template[] = [
  {
    id: 'content-draft',
    title: 'Content Draft',
    description: 'Create initial content and copywriting',
    category: 'Content',
    icon: FileText,
    type: 'task',
    defaultSteps: [
      { title: 'Research', description: 'Research topic and gather information' },
      { title: 'Outline creation', description: 'Create content structure and outline' },
      { title: 'First draft', description: 'Write initial content draft' },
      { title: 'Review and edit', description: 'Review and refine content' }
    ]
  },
  {
    id: 'social-media-post',
    title: 'Social Media Post',
    description: 'Create social media content with design and caption',
    category: 'Marketing',
    icon: Globe,
    type: 'task',
    defaultSteps: [
      { title: 'Content planning', description: 'Plan post theme and message' },
      { title: 'Visual design', description: 'Create graphics or select images' },
      { title: 'Caption writing', description: 'Write engaging caption' },
      { title: 'Scheduling', description: 'Schedule post for optimal timing' }
    ]
  },
  {
    id: 'bug-fix',
    title: 'Bug Fix',
    description: 'Resolve assigned technical issue',
    category: 'Development',
    icon: Bug,
    type: 'task',
    defaultSteps: [
      { title: 'Issue investigation', description: 'Analyze and reproduce the bug' },
      { title: 'Root cause analysis', description: 'Identify the underlying cause' },
      { title: 'Fix implementation', description: 'Implement the solution' },
      { title: 'Testing', description: 'Test fix and verify resolution' }
    ]
  },
  {
    id: 'client-review',
    title: 'Client Review',
    description: 'Review deliverables and gather client feedback',
    category: 'Review',
    icon: MessageSquare,
    type: 'task',
    defaultSteps: [
      { title: 'Prepare materials', description: 'Organize deliverables for review' },
      { title: 'Schedule meeting', description: 'Arrange review session with client' },
      { title: 'Present work', description: 'Show completed work to client' },
      { title: 'Collect feedback', description: 'Gather and document feedback' }
    ]
  },
  {
    id: 'payment-followup',
    title: 'Payment Follow-up',
    description: 'Send invoice and follow up on payment',
    category: 'Finance',
    icon: CreditCard,
    type: 'task',
    defaultSteps: [
      { title: 'Invoice generation', description: 'Create and send invoice' },
      { title: 'Payment tracking', description: 'Monitor payment status' },
      { title: 'Follow-up communication', description: 'Send payment reminders if needed' },
      { title: 'Payment confirmation', description: 'Confirm receipt of payment' }
    ]
  }
]

export function UnifiedTemplateSelector({ 
  onSelectTemplate, 
  onCancel, 
  userRole = 'provider',
  bookingId 
}: UnifiedTemplateSelectorProps) {
  const [activeTab, setActiveTab] = useState<'milestones' | 'tasks'>('milestones')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<{ milestones: Template[], tasks: Template[] }>({
    milestones: [],
    tasks: []
  })
  const [loading, setLoading] = useState(false)

  // Load custom templates from Supabase
  useEffect(() => {
    if (userRole === 'provider') {
      loadCustomTemplates()
    }
  }, [userRole])

  const loadCustomTemplates = async () => {
    try {
      setLoading(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('progress_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading custom templates:', error)
        return
      }

      const milestones = data.filter(t => t.type === 'milestone')
      const tasks = data.filter(t => t.type === 'task')

      setCustomTemplates({ milestones, tasks })
    } catch (error) {
      console.error('Error loading custom templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template.id)
    onSelectTemplate(template)
  }

  const allMilestoneTemplates = [...systemMilestoneTemplates, ...customTemplates.milestones]
  const allTaskTemplates = [...systemTaskTemplates, ...customTemplates.tasks]

  return (
    <div className="bg-white w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg w-10 h-10 flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Template Library</h2>
              <p className="text-sm text-muted-foreground">
                Choose from professional templates to get started quickly
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'milestones' | 'tasks')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="milestones" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Milestone Templates
              <Badge variant="secondary" className="ml-1 text-xs">
                {allMilestoneTemplates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Task Templates
              <Badge variant="secondary" className="ml-1 text-xs">
                {allTaskTemplates.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'milestones' | 'tasks')}>
          {/* Milestone Templates */}
          <TabsContent value="milestones" className="space-y-6">
            {/* System Templates */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemMilestoneTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    {...template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => handleTemplateSelect(template)}
                    userRole={userRole}
                  />
                ))}
              </div>
            </div>

            {/* Custom Templates */}
            {userRole === 'provider' && customTemplates.milestones.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Templates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTemplates.milestones.map((template) => (
                    <TemplateCard
                      key={template.id}
                      {...template}
                      isCustom={true}
                      isSelected={selectedTemplate === template.id}
                      onSelect={() => handleTemplateSelect(template)}
                      userRole={userRole}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Task Templates */}
          <TabsContent value="tasks" className="space-y-6">
            {/* System Templates */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTaskTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    {...template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => handleTemplateSelect(template)}
                    userRole={userRole}
                  />
                ))}
              </div>
            </div>

            {/* Custom Templates */}
            {userRole === 'provider' && customTemplates.tasks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Templates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTemplates.tasks.map((template) => (
                    <TemplateCard
                      key={template.id}
                      {...template}
                      isCustom={true}
                      isSelected={selectedTemplate === template.id}
                      onSelect={() => handleTemplateSelect(template)}
                      userRole={userRole}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {((activeTab === 'milestones' && allMilestoneTemplates.length === 0) ||
          (activeTab === 'tasks' && allTaskTemplates.length === 0)) && (
          <div className="text-center py-16 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates available</h3>
            <p className="text-sm text-gray-500">
              {userRole === 'provider' ? 'Create your first custom template' : 'Templates will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="text-sm font-medium px-6 py-2"
          >
            Cancel
          </Button>
          
          {selectedTemplate && (
            <Button
              onClick={() => {
                const template = [...allMilestoneTemplates, ...allTaskTemplates].find(t => t.id === selectedTemplate)
                if (template) {
                  onSelectTemplate(template)
                }
              }}
              className="text-sm font-medium px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Use Selected Template
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
