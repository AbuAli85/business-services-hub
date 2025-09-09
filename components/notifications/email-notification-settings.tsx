'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Settings, Clock, Palette } from 'lucide-react'
import { toast } from 'sonner'

interface EmailPreferences {
  id?: string
  user_id: string
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
    } finally {
      setLoading(false)
    }
  }

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

  const savePreferences = async () => {
    if (!preferences) return

    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

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
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No email preferences found</p>
            <Button onClick={loadEmailPreferences} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
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
          </div>

          <Separator />

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
        </CardContent>
      </Card>
    </div>
  )
}
