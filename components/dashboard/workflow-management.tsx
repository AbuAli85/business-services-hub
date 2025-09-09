'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Workflow, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar,
  Users,
  Target,
  GitBranch,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Settings,
  BarChart3,
  FileText,
  Zap,
  RefreshCw,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  WorkflowStep, 
  WorkflowCondition, 
  WorkflowAction, 
  WorkflowTemplate, 
  WorkflowExecution, 
  WorkflowStepExecution 
} from '@/types/milestone-system'

interface WorkflowManagementProps {
  bookingId: string
  onWorkflowCreated?: (workflow: WorkflowTemplate) => void
  onWorkflowUpdated?: (workflow: WorkflowTemplate) => void
  onWorkflowDeleted?: (workflowId: string) => void
}

export function WorkflowManagement({ 
  bookingId, 
  onWorkflowCreated,
  onWorkflowUpdated,
  onWorkflowDeleted
}: WorkflowManagementProps) {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('templates')
  
  // Dialog states
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [showStepForm, setShowStepForm] = useState(false)
  const [showExecutionForm, setShowExecutionForm] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    service_type: '',
    is_active: true
  })

  const [stepForm, setStepForm] = useState({
    name: '',
    description: '',
    type: 'milestone' as 'milestone' | 'task' | 'approval' | 'notification' | 'condition',
    order_index: 0,
    estimated_duration: 0,
    assigned_to: '',
    due_date: ''
  })

  useEffect(() => {
    loadWorkflows()
    loadExecutions()
  }, [bookingId])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      // Load workflows from database
      console.log('Loading workflow templates...')
      // This would be implemented with actual Supabase calls
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExecutions = async () => {
    try {
      // Load workflow executions from database
      console.log('Loading workflow executions...')
      // This would be implemented with actual Supabase calls
    } catch (error) {
      console.error('Error loading executions:', error)
    }
  }

  const handleWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const workflowData: WorkflowTemplate = {
        id: `workflow_${Date.now()}`,
        ...workflowForm,
        steps: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Creating workflow:', workflowData)
      toast.success('Workflow created successfully')
      onWorkflowCreated?.(workflowData)
      
      setShowWorkflowForm(false)
      setEditingWorkflow(null)
      resetWorkflowForm()
    } catch (error) {
      console.error('Workflow creation error:', error)
      toast.error('Failed to create workflow')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const stepData = {
        ...stepForm,
        id: `step_${Date.now()}`,
        status: 'pending' as const,
        conditions: [],
        actions: [],
        next_steps: [],
        previous_steps: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Creating workflow step:', stepData)
      toast.success('Workflow step created successfully')
      
      setShowStepForm(false)
      setEditingStep(null)
      resetStepForm()
    } catch (error) {
      console.error('Step creation error:', error)
      toast.error('Failed to create workflow step')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartExecution = async (workflowId: string) => {
    try {
      const executionData = {
        id: `exec_${Date.now()}`,
        workflow_id: workflowId,
        booking_id: bookingId,
        current_step_id: '',
        status: 'running' as const,
        started_at: new Date().toISOString(),
        step_executions: []
      }
      
      console.log('Starting workflow execution:', executionData)
      toast.success('Workflow execution started')
    } catch (error) {
      console.error('Workflow execution error:', error)
      toast.error('Failed to start workflow execution')
    }
  }

  const resetWorkflowForm = () => {
    setWorkflowForm({
      name: '',
      description: '',
      service_type: '',
      is_active: true
    })
  }

  const resetStepForm = () => {
    setStepForm({
      name: '',
      description: '',
      type: 'milestone',
      order_index: 0,
      estimated_duration: 0,
      assigned_to: '',
      due_date: ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <Target className="h-4 w-4" />
      case 'task': return <CheckCircle className="h-4 w-4" />
      case 'approval': return <Users className="h-4 w-4" />
      case 'notification': return <AlertTriangle className="h-4 w-4" />
      case 'condition': return <GitBranch className="h-4 w-4" />
      default: return <Workflow className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading workflow management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workflow Management</h2>
          <p className="text-gray-600">Create and manage automated workflows for project execution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowWorkflowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Workflow Templates */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    </div>
                    <Badge className={workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{workflow.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Steps:</span>
                      <span className="font-medium">{workflow.steps.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Service Type:</span>
                      <Badge variant="outline">{workflow.service_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWorkflow(workflow)
                          setShowStepForm(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Step
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartExecution(workflow.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWorkflow(workflow)
                          setWorkflowForm({
                            name: workflow.name,
                            description: workflow.description,
                            service_type: workflow.service_type,
                            is_active: workflow.is_active
                          })
                          setShowWorkflowForm(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {workflows.length === 0 && (
            <div className="text-center py-12">
              <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workflows Created</h3>
              <p className="text-gray-600 mb-4">Create your first workflow to automate project processes</p>
              <Button
                onClick={() => setShowWorkflowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Workflow Executions */}
        <TabsContent value="executions" className="space-y-6">
          <div className="space-y-4">
            {executions.map((execution) => (
              <Card key={execution.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Execution #{execution.id.slice(-8)}
                      </h3>
                    </div>
                    <Badge className={getStatusColor(execution.status)}>
                      {execution.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Started: {new Date(execution.started_at).toLocaleDateString()}
                    </div>
                    {execution.completed_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Completed: {new Date(execution.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Step:</span>
                      <span className="font-medium">{execution.current_step_id || 'Not started'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Steps Completed:</span>
                      <span className="font-medium">
                        {execution.step_executions.filter(step => step.status === 'completed').length} / {execution.step_executions.length}
                      </span>
                    </div>
                    {execution.error_message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Error:</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{execution.error_message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {executions.length === 0 && (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Executions</h3>
              <p className="text-gray-600">Start a workflow to see executions here</p>
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Workflow Analytics</h3>
            <p className="text-gray-600">Analytics and insights for workflow performance</p>
          </div>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-6">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Workflow Settings</h3>
            <p className="text-gray-600">Configure workflow management preferences</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Form Dialog */}
      <Dialog open={showWorkflowForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowWorkflowForm(false)
          setEditingWorkflow(null)
          setIsSubmitting(false)
          resetWorkflowForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowWorkflowForm(false)
            setEditingWorkflow(null)
            setIsSubmitting(false)
            resetWorkflowForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWorkflowSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm({...workflowForm, name: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service Type *</label>
                <Select
                  value={workflowForm.service_type}
                  onValueChange={(value) => setWorkflowForm({...workflowForm, service_type: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_development">Web Development</SelectItem>
                    <SelectItem value="digital_marketing">Digital Marketing</SelectItem>
                    <SelectItem value="mobile_development">Mobile Development</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={workflowForm.description}
                onChange={(e) => setWorkflowForm({...workflowForm, description: e.target.value})}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowWorkflowForm(false)
                  setEditingWorkflow(null)
                  setIsSubmitting(false)
                  resetWorkflowForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingWorkflow ? 'Update' : 'Create') + ' Workflow'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Step Form Dialog */}
      <Dialog open={showStepForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowStepForm(false)
          setEditingStep(null)
          setIsSubmitting(false)
          resetStepForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowStepForm(false)
            setEditingStep(null)
            setIsSubmitting(false)
            resetStepForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingStep ? 'Edit Workflow Step' : 'Add Workflow Step'}
              {selectedWorkflow && ` to ${selectedWorkflow.name}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStepSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={stepForm.name}
                  onChange={(e) => setStepForm({...stepForm, name: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <Select
                  value={stepForm.type}
                  onValueChange={(value) => setStepForm({...stepForm, type: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Order Index</label>
                <Input
                  type="number"
                  value={stepForm.order_index}
                  onChange={(e) => setStepForm({...stepForm, order_index: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Duration (hours)</label>
                <Input
                  type="number"
                  value={stepForm.estimated_duration}
                  onChange={(e) => setStepForm({...stepForm, estimated_duration: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={stepForm.description}
                onChange={(e) => setStepForm({...stepForm, description: e.target.value})}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowStepForm(false)
                  setEditingStep(null)
                  setIsSubmitting(false)
                  resetStepForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingStep ? 'Update' : 'Add') + ' Step'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
