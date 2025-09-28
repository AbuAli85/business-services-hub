'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface NotificationSettingsProps {
  bookingId: string
  className?: string
}

interface NotificationRule {
  id: string
  name: string
  enabled: boolean
  type: 'milestone_due' | 'task_assigned' | 'milestone_completed' | 'task_overdue' | 'custom'
  trigger: 'immediate' | '1h_before' | '1d_before' | '1w_before' | 'custom'
  customHours?: number
  channels: ('email' | 'slack' | 'whatsapp' | 'in_app')[]
  message?: string
  created_at: string
  updated_at: string
}

interface SlackWebhook {
  id: string
  name: string
  webhook_url: string
  enabled: boolean
  created_at: string
}

interface WhatsAppConfig {
  id: string
  name: string
  phone_number: string
  enabled: boolean
  created_at: string
}

export function NotificationSettings({ bookingId, className }: NotificationSettingsProps) {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [slackWebhooks, setSlackWebhooks] = useState<SlackWebhook[]>([])
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showSlackForm, setShowSlackForm] = useState(false)
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false)

  const [ruleForm, setRuleForm] = useState({
    name: '',
    enabled: true,
    type: 'milestone_due' as 'milestone_due' | 'task_assigned' | 'milestone_completed' | 'task_overdue' | 'custom',
    trigger: '1d_before' as 'immediate' | '1h_before' | '1d_before' | '1w_before' | 'custom',
    customHours: 24,
    channels: ['email'] as ('email' | 'slack' | 'whatsapp' | 'in_app')[],
    message: ''
  })

  const [slackForm, setSlackForm] = useState({
    name: '',
    webhook_url: '',
    enabled: true
  })

  const [whatsappForm, setWhatsappForm] = useState({
    name: '',
    phone_number: '',
    enabled: true
  })

  useEffect(() => {
    loadNotificationSettings()
  }, [bookingId])

  const loadNotificationSettings = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Load notification rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (rulesError) throw rulesError

      // Load Slack webhooks
      const { data: slackData, error: slackError } = await supabase
        .from('slack_webhooks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (slackError) console.warn('Slack webhooks error:', slackError)

      // Load WhatsApp configs
      const { data: whatsappData, error: whatsappError } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (whatsappError) console.warn('WhatsApp configs error:', whatsappError)

      setRules(rulesData || [])
      setSlackWebhooks(slackData || [])
      setWhatsappConfigs(whatsappData || [])
    } catch (error) {
      console.error('Error loading notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const createNotificationRule = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('notification_rules')
        .insert({
          booking_id: bookingId,
          name: ruleForm.name,
          enabled: ruleForm.enabled,
          type: ruleForm.type,
          trigger: ruleForm.trigger,
          custom_hours: ruleForm.customHours,
          channels: ruleForm.channels,
          message: ruleForm.message || getDefaultMessage(ruleForm.type),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setRules(prev => [data, ...prev])
      setShowRuleForm(false)
      resetRuleForm()
      toast.success('Notification rule created successfully')
    } catch (error) {
      console.error('Error creating notification rule:', error)
      toast.error('Failed to create notification rule')
    }
  }

  const updateNotificationRule = async (ruleId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('notification_rules')
        .update({
          name: ruleForm.name,
          enabled: ruleForm.enabled,
          type: ruleForm.type,
          trigger: ruleForm.trigger,
          custom_hours: ruleForm.customHours,
          channels: ruleForm.channels,
          message: ruleForm.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)

      if (error) throw error

      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              name: ruleForm.name,
              enabled: ruleForm.enabled,
              type: ruleForm.type as any,
              trigger: ruleForm.trigger as any,
              custom_hours: ruleForm.customHours,
              channels: ruleForm.channels as any,
              message: ruleForm.message,
              updated_at: new Date().toISOString() 
            }
          : rule
      ))
      setEditingRule(null)
      setShowRuleForm(false)
      resetRuleForm()
      toast.success('Notification rule updated successfully')
    } catch (error) {
      console.error('Error updating notification rule:', error)
      toast.error('Failed to update notification rule')
    }
  }

  const deleteNotificationRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this notification rule?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      setRules(prev => prev.filter(rule => rule.id !== ruleId))
      toast.success('Notification rule deleted successfully')
    } catch (error) {
      console.error('Error deleting notification rule:', error)
      toast.error('Failed to delete notification rule')
    }
  }

  const createSlackWebhook = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('slack_webhooks')
        .insert({
          booking_id: bookingId,
          name: slackForm.name,
          webhook_url: slackForm.webhook_url,
          enabled: slackForm.enabled,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setSlackWebhooks(prev => [data, ...prev])
      setShowSlackForm(false)
      setSlackForm({ name: '', webhook_url: '', enabled: true })
      toast.success('Slack webhook created successfully')
    } catch (error) {
      console.error('Error creating Slack webhook:', error)
      toast.error('Failed to create Slack webhook')
    }
  }

  const createWhatsAppConfig = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .insert({
          booking_id: bookingId,
          name: whatsappForm.name,
          phone_number: whatsappForm.phone_number,
          enabled: whatsappForm.enabled,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setWhatsappConfigs(prev => [data, ...prev])
      setShowWhatsAppForm(false)
      setWhatsappForm({ name: '', phone_number: '', enabled: true })
      toast.success('WhatsApp configuration created successfully')
    } catch (error) {
      console.error('Error creating WhatsApp config:', error)
      toast.error('Failed to create WhatsApp configuration')
    }
  }

  const getDefaultMessage = (type: string) => {
    switch (type) {
      case 'milestone_due':
        return 'Milestone "{milestone_title}" is due soon. Please review and update progress.'
      case 'task_assigned':
        return 'New task "{task_title}" has been assigned to you in milestone "{milestone_title}".'
      case 'milestone_completed':
        return 'Milestone "{milestone_title}" has been completed! Great work!'
      case 'task_overdue':
        return 'Task "{task_title}" is overdue. Please update its status.'
      default:
        return 'Notification: {message}'
    }
  }

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      enabled: true,
      type: 'milestone_due' as const,
      trigger: '1d_before' as const,
      customHours: 24,
      channels: ['email'] as const,
      message: ''
    })
  }

  const editRule = (rule: NotificationRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      enabled: rule.enabled,
      type: rule.type,
      trigger: rule.trigger,
      customHours: rule.customHours || 24,
      channels: rule.channels,
      message: rule.message || ''
    })
    setShowRuleForm(true)
  }

  const testNotification = async (ruleId: string) => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, bookingId })
      })

      if (response.ok) {
        toast.success('Test notification sent successfully')
      } else {
        throw new Error('Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading notification settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-blue-600" />
              <CardTitle>Notification Settings</CardTitle>
            </div>
            <Button onClick={() => setShowRuleForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Rules */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Rules</h3>
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Type:</strong> {rule.type.replace('_', ' ')}</p>
                          <p><strong>Trigger:</strong> {rule.trigger.replace('_', ' ')}</p>
                          <p><strong>Channels:</strong> {rule.channels.join(', ')}</p>
                          {rule.message && <p><strong>Message:</strong> {rule.message}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testNotification(rule.id)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteNotificationRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rules.length === 0 && (
                <p className="text-gray-500 text-center py-4">No notification rules configured</p>
              )}
            </div>
          </div>

          {/* External Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slack Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Slack Integration</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowSlackForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slackWebhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{webhook.name}</p>
                        <p className="text-sm text-gray-600">{webhook.webhook_url.substring(0, 50)}...</p>
                      </div>
                      <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                        {webhook.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                  {slackWebhooks.length === 0 && (
                    <p className="text-gray-500 text-sm">No Slack webhooks configured</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">WhatsApp Integration</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowWhatsAppForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Config
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {whatsappConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{config.name}</p>
                        <p className="text-sm text-gray-600">{config.phone_number}</p>
                      </div>
                      <Badge variant={config.enabled ? 'default' : 'secondary'}>
                        {config.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                  {whatsappConfigs.length === 0 && (
                    <p className="text-gray-500 text-sm">No WhatsApp configurations</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rule Form Modal */}
          {showRuleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {editingRule ? 'Edit Notification Rule' : 'Create Notification Rule'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowRuleForm(false)
                      setEditingRule(null)
                      resetRuleForm()
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ruleName">Rule Name</Label>
                    <Input
                      id="ruleName"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ruleType">Type</Label>
                      <Select
                        value={ruleForm.type}
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, type: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="milestone_due">Milestone Due</SelectItem>
                          <SelectItem value="task_assigned">Task Assigned</SelectItem>
                          <SelectItem value="milestone_completed">Milestone Completed</SelectItem>
                          <SelectItem value="task_overdue">Task Overdue</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ruleTrigger">Trigger</Label>
                      <Select
                        value={ruleForm.trigger}
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, trigger: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="1h_before">1 Hour Before</SelectItem>
                          <SelectItem value="1d_before">1 Day Before</SelectItem>
                          <SelectItem value="1w_before">1 Week Before</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {ruleForm.trigger === 'custom' && (
                    <div>
                      <Label htmlFor="customHours">Custom Hours</Label>
                      <Input
                        id="customHours"
                        type="number"
                        value={ruleForm.customHours}
                        onChange={(e) => setRuleForm(prev => ({ ...prev, customHours: parseInt(e.target.value) || 24 }))}
                        placeholder="24"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Notification Channels</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['email', 'slack', 'whatsapp', 'in_app'].map((channel) => (
                        <div key={channel} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={channel}
                            checked={ruleForm.channels.includes(channel as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRuleForm(prev => ({
                                  ...prev,
                                  channels: [...prev.channels, channel as any]
                                }))
                              } else {
                                setRuleForm(prev => ({
                                  ...prev,
                                  channels: prev.channels.filter(c => c !== channel)
                                }))
                              }
                            }}
                            aria-label={`Enable ${channel.replace('_', ' ')} notifications`}
                            title={`Enable ${channel.replace('_', ' ')} notifications`}
                          />
                          <Label htmlFor={channel} className="text-sm capitalize">
                            {channel.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ruleMessage">Custom Message (Optional)</Label>
                    <Textarea
                      id="ruleMessage"
                      value={ruleForm.message}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter custom message template..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use variables like {'{milestone_title}'}, {'{task_title}'}, {'{user_name}'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ruleEnabled"
                      checked={ruleForm.enabled}
                      onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Label htmlFor="ruleEnabled">Enable this rule</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRuleForm(false)
                        setEditingRule(null)
                        resetRuleForm()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingRule ? () => updateNotificationRule(editingRule.id) : createNotificationRule}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingRule ? 'Update' : 'Create'} Rule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Slack Form Modal */}
          {showSlackForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add Slack Webhook</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowSlackForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="slackName">Name</Label>
                    <Input
                      id="slackName"
                      value={slackForm.name}
                      onChange={(e) => setSlackForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter webhook name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slackUrl">Webhook URL</Label>
                    <Input
                      id="slackUrl"
                      value={slackForm.webhook_url}
                      onChange={(e) => setSlackForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="slackEnabled"
                      checked={slackForm.enabled}
                      onCheckedChange={(checked) => setSlackForm(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Label htmlFor="slackEnabled">Enable webhook</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSlackForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createSlackWebhook}>
                      <Save className="h-4 w-4 mr-2" />
                      Create Webhook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* WhatsApp Form Modal */}
          {showWhatsAppForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add WhatsApp Configuration</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowWhatsAppForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="whatsappName">Name</Label>
                    <Input
                      id="whatsappName"
                      value={whatsappForm.name}
                      onChange={(e) => setWhatsappForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter configuration name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappPhone">Phone Number</Label>
                    <Input
                      id="whatsappPhone"
                      value={whatsappForm.phone_number}
                      onChange={(e) => setWhatsappForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="whatsappEnabled"
                      checked={whatsappForm.enabled}
                      onCheckedChange={(checked) => setWhatsappForm(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Label htmlFor="whatsappEnabled">Enable configuration</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowWhatsAppForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createWhatsAppConfig}>
                      <Save className="h-4 w-4 mr-2" />
                      Create Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
