'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Workflow,
  Target,
  FileText,
  Bell,
  Shield,
  Palette,
  Database,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import type { 
  MilestoneSettings as MilestoneSettingsType, 
  MilestoneTemplate, 
  MilestoneTemplateTask 
} from '@/types/milestone-system'

interface MilestoneSettingsProps {
  bookingId: string
  onSettingsUpdated?: (settings: MilestoneSettingsType) => void
}

export function MilestoneSettings({ 
  bookingId, 
  onSettingsUpdated 
}: MilestoneSettingsProps) {
  const [settings, setSettings] = useState<MilestoneSettingsType>({
    // General Settings
    default_priority: 'medium',
    default_risk_level: 'low',
    auto_progress_calculation: true,
    critical_path_enabled: true,
    dependency_validation: true,
    
    // Notification Settings
    milestone_reminders: true,
    task_reminders: true,
    dependency_alerts: true,
    overdue_notifications: true,
    completion_notifications: true,
    
    // Workflow Settings
    auto_status_updates: false,
    require_approval: true,
    client_visibility: true,
    progress_reporting: true,
    
    // Template Settings
    default_template: '',
    auto_create_tasks: true,
    task_estimation: true,
    
    // UI Settings
    theme: 'auto',
    compact_view: false,
    show_progress_bars: true,
    show_dependencies: true,
    show_risk_indicators: true
  })

  const [templates, setTemplates] = useState<MilestoneTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    loadSettings()
    loadTemplates()
  }, [bookingId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Load settings from database or localStorage
      const savedSettings = localStorage.getItem(`milestone-settings-${bookingId}`)
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      // Load templates from database
      console.log('Loading milestone templates...')
      // This would be implemented with actual Supabase calls
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Save settings to localStorage and database
      localStorage.setItem(`milestone-settings-${bookingId}`, JSON.stringify(settings))
      
      // Save to database
      console.log('Saving milestone settings:', settings)
      
      toast.success('Settings saved successfully')
      onSettingsUpdated?.(settings)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        default_priority: 'medium',
        default_risk_level: 'low',
        auto_progress_calculation: true,
        critical_path_enabled: true,
        dependency_validation: true,
        milestone_reminders: true,
        task_reminders: true,
        dependency_alerts: true,
        overdue_notifications: true,
        completion_notifications: true,
        auto_status_updates: false,
        require_approval: true,
        client_visibility: true,
        progress_reporting: true,
        default_template: '',
        auto_create_tasks: true,
        task_estimation: true,
        theme: 'auto',
        compact_view: false,
        show_progress_bars: true,
        show_dependencies: true,
        show_risk_indicators: true
      })
      toast.success('Settings reset to default')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Milestone Settings</h2>
          <p className="text-gray-600">Configure milestone and task management preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ui">Interface</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Default Priority</label>
                  <Select
                    value={settings.default_priority}
                    onValueChange={(value) => setSettings({...settings, default_priority: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Default Risk Level</label>
                  <Select
                    value={settings.default_risk_level}
                    onValueChange={(value) => setSettings({...settings, default_risk_level: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Auto Progress Calculation</h4>
                    <p className="text-sm text-gray-600">Automatically calculate progress based on task completion</p>
                  </div>
                  <Switch
                    checked={settings.auto_progress_calculation}
                    onCheckedChange={(checked) => setSettings({...settings, auto_progress_calculation: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Critical Path Analysis</h4>
                    <p className="text-sm text-gray-600">Enable critical path identification and management</p>
                  </div>
                  <Switch
                    checked={settings.critical_path_enabled}
                    onCheckedChange={(checked) => setSettings({...settings, critical_path_enabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Dependency Validation</h4>
                    <p className="text-sm text-gray-600">Validate dependencies to prevent circular references</p>
                  </div>
                  <Switch
                    checked={settings.dependency_validation}
                    onCheckedChange={(checked) => setSettings({...settings, dependency_validation: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Milestone Reminders</h4>
                  <p className="text-sm text-gray-600">Get notified about upcoming milestone deadlines</p>
                </div>
                <Switch
                  checked={settings.milestone_reminders}
                  onCheckedChange={(checked) => setSettings({...settings, milestone_reminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Task Reminders</h4>
                  <p className="text-sm text-gray-600">Get notified about upcoming task deadlines</p>
                </div>
                <Switch
                  checked={settings.task_reminders}
                  onCheckedChange={(checked) => setSettings({...settings, task_reminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Dependency Alerts</h4>
                  <p className="text-sm text-gray-600">Get notified when dependencies are affected</p>
                </div>
                <Switch
                  checked={settings.dependency_alerts}
                  onCheckedChange={(checked) => setSettings({...settings, dependency_alerts: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Overdue Notifications</h4>
                  <p className="text-sm text-gray-600">Get notified about overdue milestones and tasks</p>
                </div>
                <Switch
                  checked={settings.overdue_notifications}
                  onCheckedChange={(checked) => setSettings({...settings, overdue_notifications: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Completion Notifications</h4>
                  <p className="text-sm text-gray-600">Get notified when milestones or tasks are completed</p>
                </div>
                <Switch
                  checked={settings.completion_notifications}
                  onCheckedChange={(checked) => setSettings({...settings, completion_notifications: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Settings */}
        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Workflow Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Auto Status Updates</h4>
                  <p className="text-sm text-gray-600">Automatically update status based on progress</p>
                </div>
                <Switch
                  checked={settings.auto_status_updates}
                  onCheckedChange={(checked) => setSettings({...settings, auto_status_updates: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Require Approval</h4>
                  <p className="text-sm text-gray-600">Require client approval for milestone completion</p>
                </div>
                <Switch
                  checked={settings.require_approval}
                  onCheckedChange={(checked) => setSettings({...settings, require_approval: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Client Visibility</h4>
                  <p className="text-sm text-gray-600">Allow clients to view milestone progress</p>
                </div>
                <Switch
                  checked={settings.client_visibility}
                  onCheckedChange={(checked) => setSettings({...settings, client_visibility: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Progress Reporting</h4>
                  <p className="text-sm text-gray-600">Generate automatic progress reports</p>
                </div>
                <Switch
                  checked={settings.progress_reporting}
                  onCheckedChange={(checked) => setSettings({...settings, progress_reporting: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Settings */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Default Template</label>
                <Select
                  value={settings.default_template}
                  onValueChange={(value) => setSettings({...settings, default_template: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Auto Create Tasks</h4>
                    <p className="text-sm text-gray-600">Automatically create tasks from template when creating milestones</p>
                  </div>
                  <Switch
                    checked={settings.auto_create_tasks}
                    onCheckedChange={(checked) => setSettings({...settings, auto_create_tasks: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Task Estimation</h4>
                    <p className="text-sm text-gray-600">Enable time estimation for tasks</p>
                  </div>
                  <Switch
                    checked={settings.task_estimation}
                    onCheckedChange={(checked) => setSettings({...settings, task_estimation: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Settings */}
        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Interface Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => setSettings({...settings, theme: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Compact View</h4>
                    <p className="text-sm text-gray-600">Use compact layout for better space utilization</p>
                  </div>
                  <Switch
                    checked={settings.compact_view}
                    onCheckedChange={(checked) => setSettings({...settings, compact_view: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Show Progress Bars</h4>
                    <p className="text-sm text-gray-600">Display progress bars for milestones and tasks</p>
                  </div>
                  <Switch
                    checked={settings.show_progress_bars}
                    onCheckedChange={(checked) => setSettings({...settings, show_progress_bars: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Show Dependencies</h4>
                    <p className="text-sm text-gray-600">Display dependency information in milestone cards</p>
                  </div>
                  <Switch
                    checked={settings.show_dependencies}
                    onCheckedChange={(checked) => setSettings({...settings, show_dependencies: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Show Risk Indicators</h4>
                    <p className="text-sm text-gray-600">Display risk level indicators for milestones and tasks</p>
                  </div>
                  <Switch
                    checked={settings.show_risk_indicators}
                    onCheckedChange={(checked) => setSettings({...settings, show_risk_indicators: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Configuration</h3>
                <p className="text-sm">Advanced settings and system configuration options</p>
                <Button variant="outline" className="mt-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
