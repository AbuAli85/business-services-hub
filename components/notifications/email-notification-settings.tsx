'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
<<<<<<< HEAD
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { NotificationType } from '@/types/notifications'
=======
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Settings, Clock, Palette } from 'lucide-react'
import { toast } from 'sonner'
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712

interface EmailPreferences {
  id?: string
  user_id: string
<<<<<<< HEAD
  email_enabled: boolean
  template_style: 'modern' | 'minimal' | 'corporate'
  delivery_frequency: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never'
  disabled_types: NotificationType[]
  created_at?: string
  updated_at?: string
}

export function EmailNotificationSettings() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences
        const defaultPreferences: EmailPreferences = {
          user_id: user.id,
          email_enabled: true,
          template_style: 'modern',
          delivery_frequency: 'immediate',
          disabled_types: []
        }
        setPreferences(defaultPreferences)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
=======
  email_address: string
  is_verified: boolean
  email_template_style: 'modern' | 'minimal' | 'corporate'
  send_time_preference: 'immediate' | 'daily' | 'weekly' | 'never'
  daily_digest_time: string
  weekly_digest_day: number
  is_unsubscribed: boolean
}

interface EmailNotificationSettingsProps {
  userId: string
  className?: string
}

export function EmailNotificationSettings({ userId, className = '' }: EmailNotificationSettingsProps) {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailStats, setEmailStats] = useState({
    total_sent: 0,
    total_failed: 0,
    delivery_rate: 0,
    recent_emails: []
  })

  useEffect(() => {
    loadEmailPreferences()
    loadEmailStats()
  }, [userId])

  const loadEmailPreferences = async () => {
    try {
      const response = await fetch(`/api/notifications/email-preferences?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Error loading email preferences:', error)
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
    } finally {
      setLoading(false)
    }
  }

<<<<<<< HEAD
=======
  const loadEmailStats = async () => {
    try {
      const response = await fetch(`/api/notifications/email-stats?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setEmailStats(data)
      }
    } catch (error) {
      console.error('Error loading email stats:', error)
    }
  }

>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
<<<<<<< HEAD
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_email_preferences')
        .upsert({
          ...preferences,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: 'Email preferences saved successfully!' })
    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' })
=======
    try {
      const response = await fetch('/api/notifications/email-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        toast.success('Email preferences saved successfully!')
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving email preferences:', error)
      toast.error('Failed to save email preferences')
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
    } finally {
      setSaving(false)
    }
  }

<<<<<<< HEAD
  const toggleNotificationType = (type: NotificationType) => {
    if (!preferences) return

    const disabledTypes = preferences.disabled_types || []
    const isDisabled = disabledTypes.includes(type)
    
    if (isDisabled) {
      setPreferences({
        ...preferences,
        disabled_types: disabledTypes.filter(t => t !== type)
      })
    } else {
      setPreferences({
        ...preferences,
        disabled_types: [...disabledTypes, type]
      })
    }
  }

  const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
    { type: 'booking_created', label: 'New Bookings', description: 'When a new booking is created' },
    { type: 'booking_updated', label: 'Booking Updates', description: 'When a booking is modified' },
    { type: 'booking_cancelled', label: 'Booking Cancellations', description: 'When a booking is cancelled' },
    { type: 'booking_confirmed', label: 'Booking Confirmations', description: 'When a booking is confirmed' },
    { type: 'booking_reminder', label: 'Booking Reminders', description: 'Reminders about upcoming bookings' },
    { type: 'booking_completed', label: 'Booking Completion', description: 'When a booking is completed' },
    { type: 'task_created', label: 'New Tasks', description: 'When a new task is assigned' },
    { type: 'task_updated', label: 'Task Updates', description: 'When a task is modified' },
    { type: 'task_completed', label: 'Task Completion', description: 'When a task is completed' },
    { type: 'task_overdue', label: 'Overdue Tasks', description: 'When a task becomes overdue' },
    { type: 'milestone_created', label: 'New Milestones', description: 'When a new milestone is created' },
    { type: 'milestone_updated', label: 'Milestone Updates', description: 'When a milestone is modified' },
    { type: 'milestone_completed', label: 'Milestone Completion', description: 'When a milestone is completed' },
    { type: 'milestone_overdue', label: 'Overdue Milestones', description: 'When a milestone becomes overdue' },
    { type: 'payment_received', label: 'Payment Received', description: 'When a payment is received' },
    { type: 'payment_failed', label: 'Payment Failed', description: 'When a payment fails' },
    { type: 'invoice_created', label: 'New Invoices', description: 'When a new invoice is created' },
    { type: 'invoice_overdue', label: 'Overdue Invoices', description: 'When an invoice becomes overdue' },
    { type: 'invoice_paid', label: 'Invoice Paid', description: 'When an invoice is paid' }
  ]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>Loading your email preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
=======
  const updatePreference = (key: keyof EmailPreferences, value: any) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  const testEmail = async () => {
    if (!preferences?.email_address) return

    setSaving(true)
    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email_address: preferences.email_address,
        }),
      })

      if (response.ok) {
        toast.success('Test email sent successfully!')
      } else {
        throw new Error('Failed to send test email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading email preferences...</span>
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
<<<<<<< HEAD
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>Unable to load your email preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadPreferences} variant="outline">
            Try Again
          </Button>
=======
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No email preferences found</p>
            <Button onClick={loadEmailPreferences} className="mt-2">
              Retry
            </Button>
          </div>
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
        </CardContent>
      </Card>
    )
  }

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>
            Configure how and when you receive email notifications about your business activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Email Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Turn email notifications on or off completely
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, email_enabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="template-style">Email Template Style</Label>
              <Select
                value={preferences.template_style}
                onValueChange={(value: 'modern' | 'minimal' | 'corporate') =>
                  setPreferences({ ...preferences, template_style: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the visual style for your email notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-frequency">Delivery Frequency</Label>
              <Select
                value={preferences.delivery_frequency}
                onValueChange={(value: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never') =>
                  setPreferences({ ...preferences, delivery_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily_digest">Daily Digest</SelectItem>
                  <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How often you want to receive email notifications
              </p>
            </div>
=======
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure how and when you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email-address">Email Address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email-address"
                type="email"
                value={preferences.email_address}
                onChange={(e) => updatePreference('email_address', e.target.value)}
                className="flex-1"
              />
              {preferences.is_verified ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Unverified
                </Badge>
              )}
            </div>
          </div>

          {/* Email Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important events
              </p>
            </div>
            <Switch
              checked={!preferences.is_unsubscribed}
              onCheckedChange={(checked) => updatePreference('is_unsubscribed', !checked)}
            />
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
          </div>

          <Separator />

<<<<<<< HEAD
          {/* Notification Type Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Notification Types</h3>
              <p className="text-sm text-muted-foreground">
                Choose which types of notifications you want to receive via email
              </p>
            </div>

            <div className="grid gap-4">
              {notificationTypes.map(({ type, label, description }) => {
                const isDisabled = preferences.disabled_types?.includes(type) || false
                return (
                  <div key={type} className="flex items-start space-x-3">
                    <Checkbox
                      id={type}
                      checked={!isDisabled}
                      onCheckedChange={() => toggleNotificationType(type)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={type} className="text-sm font-medium">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {isDisabled && (
                      <Badge variant="secondary" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {preferences.disabled_types?.length || 0} notification types disabled
            </div>
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
=======
          {/* Template Style */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Email Template Style
            </Label>
            <Select
              value={preferences.email_template_style}
              onValueChange={(value: 'modern' | 'minimal' | 'corporate') => 
                updatePreference('email_template_style', value)
              }
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

          {/* Send Time Preference */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Send Time Preference
            </Label>
            <Select
              value={preferences.send_time_preference}
              onValueChange={(value: 'immediate' | 'daily' | 'weekly' | 'never') => 
                updatePreference('send_time_preference', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Daily Digest Time */}
          {preferences.send_time_preference === 'daily' && (
            <div className="space-y-2">
              <Label>Daily Digest Time</Label>
              <Input
                type="time"
                value={preferences.daily_digest_time}
                onChange={(e) => updatePreference('daily_digest_time', e.target.value)}
              />
            </div>
          )}

          {/* Weekly Digest Day */}
          {preferences.send_time_preference === 'weekly' && (
            <div className="space-y-2">
              <Label>Weekly Digest Day</Label>
              <Select
                value={preferences.weekly_digest_day.toString()}
                onValueChange={(value) => updatePreference('weekly_digest_day', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Email Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Email Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {emailStats.total_sent}
                </div>
                <div className="text-sm text-muted-foreground">Emails Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {emailStats.total_failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {emailStats.delivery_rate}%
                </div>
                <div className="text-sm text-muted-foreground">Delivery Rate</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
            <Button variant="outline" onClick={testEmail} disabled={saving}>
              <Mail className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </div>
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
        </CardContent>
      </Card>
    </div>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
