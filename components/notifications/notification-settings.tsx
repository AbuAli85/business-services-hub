'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Clock, 
  Settings as SettingsIcon,
  Save,
  RefreshCw
} from 'lucide-react'
import { 
  NotificationSettings as NotificationSettingsType, 
  NotificationType
} from '@/types/notifications'
import { notificationTemplates } from '@/lib/notification-templates'
import { notificationService } from '@/lib/notification-service'
import { toast } from 'sonner'

interface NotificationSettingsProps {
  userId: string
  className?: string
}

export function NotificationSettings({ userId, className = '' }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [userId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = notificationService.getNotificationSettings(userId)
      
      if (data) {
        setSettings(data)
      } else {
        // Create default settings
        const defaultSettings: NotificationSettingsType = {
          user_id: userId,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          notification_types: Object.keys(notificationTemplates).reduce((acc, type) => {
            acc[type as NotificationType] = true
            return acc
          }, {} as Record<NotificationType, boolean>),
          digest_frequency: 'immediate',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    try {
      setSaving(true)
      notificationService.updateNotificationSettings(userId, settings)
      toast.success('Notification settings saved successfully')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleNotificationType = (type: NotificationType, enabled: boolean) => {
    if (!settings) return
    
    setSettings(prev => ({
      ...prev!,
      notification_types: {
        ...prev!.notification_types,
        [type]: enabled
      }
    }))
  }

  const handleToggleAllTypes = (enabled: boolean) => {
    if (!settings) return
    
    const updatedTypes = Object.keys(notificationTemplates).reduce((acc, type) => {
      acc[type as NotificationType] = enabled
      return acc
    }, {} as Record<NotificationType, boolean>)
    
    setSettings(prev => ({
      ...prev!,
      notification_types: updatedTypes
    }))
  }

  const getNotificationTypeLabel = (type: NotificationType): string => {
    const template = notificationTemplates[type]
    return template.title_template.replace('{{.*?}}', '').trim() || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getNotificationTypeDescription = (type: NotificationType): string => {
    const template = notificationTemplates[type]
    return template.message_template.replace('{{.*?}}', '').trim() || `Notifications for ${type.replace('_', ' ')}`
  }

  const getCategoryTypes = (category: string): NotificationType[] => {
    const categories: Record<string, NotificationType[]> = {
      'Tasks': [
        'task_created', 'task_updated', 'task_completed', 'task_overdue', 'task_assigned', 'task_comment'
      ],
      'Milestones': [
        'milestone_created', 'milestone_updated', 'milestone_completed', 'milestone_overdue', 
        'milestone_approved', 'milestone_rejected'
      ],
      'Bookings': [
        'booking_created', 'booking_updated', 'booking_cancelled', 'booking_completed'
      ],
      'Payments': [
        'payment_received', 'payment_failed', 'invoice_created', 'invoice_overdue', 'invoice_paid'
      ],
      'Requests': [
        'request_created', 'request_updated', 'request_approved', 'request_rejected'
      ],
      'Communication': [
        'message_received', 'document_uploaded', 'document_approved', 'document_rejected'
      ],
      'System': [
        'system_announcement', 'maintenance_scheduled', 'deadline_approaching', 
        'project_delayed', 'client_feedback', 'team_mention'
      ]
    }
    return categories[category] || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Failed to load notification settings</p>
        <Button onClick={loadSettings} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600">Manage your notification preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev!, email_notifications: checked }))
                }
              />
              <p className="text-sm text-gray-600">
                Receive notifications via email
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label htmlFor="push-notifications">Push Notifications</Label>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.push_notifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev!, push_notifications: checked }))
                }
              />
              <p className="text-sm text-gray-600">
                Receive push notifications in browser
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev!, sms_notifications: checked }))
                }
              />
              <p className="text-sm text-gray-600">
                Receive notifications via SMS
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="digest-frequency">Digest Frequency</Label>
              <Select
                value={settings.digest_frequency}
                onValueChange={(value: any) => 
                  setSettings(prev => ({ ...prev!, digest_frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                How often to receive notification digests
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet-hours">Quiet Hours (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={settings.quiet_hours_start || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev!, quiet_hours_start: e.target.value }))
                  }
                  placeholder="Start time"
                />
                <span className="text-gray-500">to</span>
                <Input
                  type="time"
                  value={settings.quiet_hours_end || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev!, quiet_hours_end: e.target.value }))
                  }
                  placeholder="End time"
                />
              </div>
              <p className="text-sm text-gray-600">
                No notifications during these hours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleAllTypes(true)}
            >
              Enable All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleAllTypes(false)}
            >
              Disable All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries({
            'Tasks': getCategoryTypes('Tasks'),
            'Milestones': getCategoryTypes('Milestones'),
            'Bookings': getCategoryTypes('Bookings'),
            'Payments': getCategoryTypes('Payments'),
            'Requests': getCategoryTypes('Requests'),
            'Communication': getCategoryTypes('Communication'),
            'System': getCategoryTypes('System')
          }).map(([category, types]) => (
            <div key={category}>
              <h3 className="font-medium text-gray-900 mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map((type) => (
                  <div key={type} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Switch
                      checked={settings.notification_types[type]}
                      onCheckedChange={(checked) => handleToggleNotificationType(type, checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium text-gray-900">
                        {getNotificationTypeLabel(type)}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        {getNotificationTypeDescription(type)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
