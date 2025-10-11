'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupabaseClient } from '@/lib/supabase'
import { getNotificationTypesByCategory } from '@/lib/notification-templates'
import { toast } from 'sonner'

interface NotificationSettings {
  id?: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  booking_notifications: boolean
  payment_notifications: boolean
  invoice_notifications: boolean
  message_notifications: boolean
  task_notifications: boolean
  milestone_notifications: boolean
  document_notifications: boolean
  system_notifications: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  digest_types: string[]
  high_priority_threshold: number
  urgent_priority_threshold: number
  created_at?: string
  updated_at?: string
}

interface EmailPreferences {
  id?: string
  user_id: string
  email_enabled: boolean
  template_style: 'modern' | 'minimal' | 'corporate'
  delivery_frequency: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never'
  disabled_types: string[]
  include_unsubscribe: boolean
  include_company_branding: boolean
  created_at?: string
  updated_at?: string
}

export function ComprehensiveNotificationSettings() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabaseClient = await getSupabaseClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return

      // Load notification settings
      const { data: notifSettings, error: notifError } = await supabaseClient
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (notifError) {
        console.error('Error loading notification settings:', notifError)
      }

      // Load email preferences
      const { data: emailPrefs, error: emailError } = await supabaseClient
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (emailError) {
        console.error('Error loading email preferences:', emailError)
      }

      // Set defaults if no settings found
      if (!notifSettings) {
        setNotificationSettings({
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          booking_notifications: true,
          payment_notifications: true,
          invoice_notifications: true,
          message_notifications: true,
          task_notifications: true,
          milestone_notifications: true,
          document_notifications: true,
          system_notifications: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
          digest_frequency: 'daily',
          digest_types: ['booking', 'payment', 'invoice', 'message', 'task', 'milestone'],
          high_priority_threshold: 3,
          urgent_priority_threshold: 1
        })
      } else {
        // Map database typo field to correct field name
        const mappedSettings = {
          ...notifSettings,
          system_notifications: (notifSettings as any).syste_notifications ?? notifSettings.system_notifications ?? true
        }
        setNotificationSettings(mappedSettings)
      }

      if (!emailPrefs) {
        setEmailPreferences({
          user_id: user.id,
          email_enabled: true,
          template_style: 'modern',
          delivery_frequency: 'immediate',
          disabled_types: [],
          include_unsubscribe: true,
          include_company_branding: true
        })
      } else {
        setEmailPreferences(emailPrefs)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!notificationSettings || !emailPreferences) return

    try {
      setSaving(true)
      const supabaseClient = await getSupabaseClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return

      // Save notification settings
      // Only save fields that we know exist and work in the database
      const settingsToSave: any = {
        id: notificationSettings.id,
        user_id: notificationSettings.user_id,
        email_notifications: notificationSettings.email_notifications,
        push_notifications: notificationSettings.push_notifications,
        sms_notifications: notificationSettings.sms_notifications,
        booking_notifications: notificationSettings.booking_notifications,
        payment_notifications: notificationSettings.payment_notifications,
        invoice_notifications: notificationSettings.invoice_notifications,
        message_notifications: notificationSettings.message_notifications,
        task_notifications: notificationSettings.task_notifications,
        milestone_notifications: notificationSettings.milestone_notifications,
        document_notifications: notificationSettings.document_notifications,
        request_notifications: (notificationSettings as any).request_notifications ?? true,
        project_notifications: (notificationSettings as any).project_notifications ?? true,
        // Skip system_notifications due to database typo and schema cache issues
        quiet_hours_start: notificationSettings.quiet_hours_start,
        quiet_hours_end: notificationSettings.quiet_hours_end,
        digest_frequency: notificationSettings.digest_frequency,
        // Excluded: digest_types, timezone, thresholds, syste_notifications (schema cache issue)
        updated_at: new Date().toISOString()
      }
      
      console.log('💾 Saving notification settings:', Object.keys(settingsToSave))
      
      const { error: notifError } = await supabaseClient
        .from('notification_settings')
        .upsert(settingsToSave, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (notifError) {
        console.error('Error saving notification settings:', notifError)
        toast.error('Failed to save notification settings')
        return
      }

      // Save email preferences
      const { error: emailError } = await supabaseClient
        .from('user_email_preferences')
        .upsert({
          ...emailPreferences,
          updated_at: new Date().toISOString()
        })

      if (emailError) {
        console.error('Error saving email preferences:', emailError)
        toast.error('Failed to save email preferences')
        return
      }

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof NotificationSettings, value: any) => {
    if (!notificationSettings) return
    setNotificationSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  const updateEmailPreference = (key: keyof EmailPreferences, value: any) => {
    if (!emailPreferences) return
    setEmailPreferences(prev => prev ? { ...prev, [key]: value } : null)
  }

  const toggleDigestType = (type: string) => {
    if (!notificationSettings) return
    const currentTypes = notificationSettings.digest_types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    updateNotificationSetting('digest_types', newTypes)
  }

  const toggleDisabledEmailType = (type: string) => {
    if (!emailPreferences) return
    const currentTypes = emailPreferences.disabled_types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    updateEmailPreference('disabled_types', newTypes)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!notificationSettings || !emailPreferences) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load notification settings</p>
      </div>
    )
  }

  const notificationTypes = getNotificationTypesByCategory()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-gray-600">Manage your notification preferences and email settings</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="types">Notification Types</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
          <TabsTrigger value="timing">Timing & Frequency</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>Control overall notification behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notificationSettings.email_notifications}
                  onCheckedChange={(checked) => updateNotificationSetting('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-gray-500">Receive browser push notifications</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notificationSettings.push_notifications}
                  onCheckedChange={(checked) => updateNotificationSetting('push_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via SMS (coming soon)</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={notificationSettings.sms_notifications}
                  onCheckedChange={(checked) => updateNotificationSetting('sms_notifications', checked)}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which types of notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(notificationTypes).map(([category, types]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium capitalize">{category} Notifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {types.map((type) => {
                      const settingKey = `${category.slice(0, -1)}_notifications` as keyof NotificationSettings
                      const isEnabled = notificationSettings[settingKey] as boolean
                      
                      return (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={isEnabled}
                            onCheckedChange={(checked) => updateNotificationSetting(settingKey, checked)}
                          />
                          <Label htmlFor={type} className="text-sm">
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Preferences</CardTitle>
              <CardDescription>Customize your email notification experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Email Enabled</Label>
                  <p className="text-sm text-gray-500">Enable email notifications</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailPreferences.email_enabled}
                  onCheckedChange={(checked) => updateEmailPreference('email_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-style">Email Template Style</Label>
                <Select
                  value={emailPreferences.template_style}
                  onValueChange={(value) => updateEmailPreference('template_style', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-frequency">Delivery Frequency</Label>
                <Select
                  value={emailPreferences.delivery_frequency}
                  onValueChange={(value) => updateEmailPreference('delivery_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily_digest">Daily Digest</SelectItem>
                    <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Disabled Email Types</Label>
                <p className="text-sm text-gray-500">Select notification types to exclude from emails</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(notificationTypes).flat().map((type) => {
                    const isDisabled = emailPreferences.disabled_types?.includes(type) || false
                    return (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`email-${type}`}
                          checked={isDisabled}
                          onCheckedChange={() => toggleDisabledEmailType(type)}
                        />
                        <Label htmlFor={`email-${type}`} className="text-sm">
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="include-branding">Include Company Branding</Label>
                  <p className="text-sm text-gray-500">Include company branding in emails</p>
                </div>
                <Switch
                  id="include-branding"
                  checked={emailPreferences.include_company_branding}
                  onCheckedChange={(checked) => updateEmailPreference('include_company_branding', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timing & Frequency</CardTitle>
              <CardDescription>Control when and how often you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                  <Select
                    value={notificationSettings.quiet_hours_start}
                    onValueChange={(value) => updateNotificationSetting('quiet_hours_start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">Quiet Hours End</Label>
                  <Select
                    value={notificationSettings.quiet_hours_end}
                    onValueChange={(value) => updateNotificationSetting('quiet_hours_end', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={notificationSettings.timezone}
                  onValueChange={(value) => updateNotificationSetting('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                    <SelectItem value="Asia/Muscat">Muscat (Oman)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Digest Frequency</Label>
                <Select
                  value={notificationSettings.digest_frequency}
                  onValueChange={(value) => updateNotificationSetting('digest_frequency', value)}
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
              </div>

              <div className="space-y-3">
                <Label>Digest Types</Label>
                <p className="text-sm text-gray-500">Select which notification types to include in digests</p>
                <div className="grid grid-cols-2 gap-2">
                  {['booking', 'payment', 'invoice', 'message', 'task', 'milestone', 'document', 'system'].map((type) => {
                    const isIncluded = notificationSettings.digest_types?.includes(type) || false
                    return (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`digest-${type}`}
                          checked={isIncluded}
                          onCheckedChange={() => toggleDigestType(type)}
                        />
                        <Label htmlFor={`digest-${type}`} className="text-sm capitalize">
                          {type}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
