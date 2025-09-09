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
import { getSupabaseClient } from '@/lib/supabase'
import { NotificationType } from '@/types/notifications'

interface EmailPreferences {
  id?: string
  user_id: string
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
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

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
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>Unable to load your email preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadPreferences} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
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
          </div>

          <Separator />

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
        </CardContent>
      </Card>
    </div>
  )
}