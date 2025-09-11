'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  Palette,
  Save,
  Camera,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  avatar_url: string
  bio: string
  company_name: string
  website: string
  location: string
  timezone: string
  language: string
  role: string
}

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  booking_updates: boolean
  payment_notifications: boolean
  marketing_emails: boolean
  weekly_reports: boolean
}

interface SecuritySettings {
  two_factor_enabled: boolean
  session_timeout: number
  login_notifications: boolean
  password_change_required: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    booking_updates: true,
    payment_notifications: true,
    marketing_emails: false,
    weekly_reports: true
  })
  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 30,
    login_notifications: true,
    password_change_required: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const router = useRouter()
  const [profileColumns, setProfileColumns] = useState<string[]>([])

  // Utility function to save settings to localStorage
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        user_id: user?.id,
        ...data,
        updated_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error)
    }
  }

  // Utility function to load settings from localStorage
  const loadFromLocalStorage = (key: string, userId: string) => {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        if (parsed.user_id === userId) {
          return parsed
        }
      }
    } catch (error) {
      console.error(`Error loading from localStorage (${key}):`, error)
    }
    return null
  }

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

  const checkUserAndLoadData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      await loadUserProfile(user.id)
      // Load settings with fallback to localStorage
      await loadNotificationSettings(user.id)
      await loadSecuritySettings(user.id)
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        // capture available DB columns to avoid 400 on missing columns
        setProfileColumns(Object.keys(data))
        setProfile({
          id: data.id,
          email: data.email || user?.email || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          company_name: data.company_name || '',
          website: data.website || '',
          location: data.location || '',
          timezone: data.timezone || 'UTC',
          language: data.language || 'en',
          role: data.role || 'client'
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadNotificationSettings = async (userId: string) => {
    try {
      // Check if user_notifications table exists by trying a simple query
      const supabase = await getSupabaseClient()
      
      // Try to check if table exists first
      const { error: tableCheckError } = await supabase
        .from('user_notifications')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        // Table doesn't exist - try to load from localStorage
        console.log('Notification settings table not available, checking localStorage')
        const localSettings = loadFromLocalStorage('user_notifications', userId)
        if (localSettings) {
          setNotifications({
            email_notifications: localSettings.email_notifications ?? true,
            push_notifications: localSettings.push_notifications ?? true,
            sms_notifications: localSettings.sms_notifications ?? false,
            booking_updates: localSettings.booking_updates ?? true,
            payment_notifications: localSettings.payment_notifications ?? true,
            marketing_emails: localSettings.marketing_emails ?? false,
            weekly_reports: localSettings.weekly_reports ?? true
          })
          console.log('Loaded notification settings from localStorage')
        }
        return
      }

      // Table exists, try to load user settings
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - use default settings
          console.log('No notification settings found, using defaults')
          return
        }
        console.error('Error loading notification settings:', error)
        return
      }

      if (data) {
        setNotifications({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          sms_notifications: data.sms_notifications ?? false,
          booking_updates: data.booking_updates ?? true,
          payment_notifications: data.payment_notifications ?? true,
          marketing_emails: data.marketing_emails ?? false,
          weekly_reports: data.weekly_reports ?? true
        })
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
      // Keep default settings on any error
    }
  }

  const loadSecuritySettings = async (userId: string) => {
    try {
      // Check if user_security table exists by trying a simple query
      const supabase = await getSupabaseClient()
      
      // Try to check if table exists first
      const { error: tableCheckError } = await supabase
        .from('user_security')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        // Table doesn't exist - try to load from localStorage
        console.log('Security settings table not available, checking localStorage')
        const localSettings = loadFromLocalStorage('user_security', userId)
        if (localSettings) {
          setSecurity({
            two_factor_enabled: localSettings.two_factor_enabled ?? false,
            session_timeout: localSettings.session_timeout ?? 30,
            login_notifications: localSettings.login_notifications ?? true,
            password_change_required: localSettings.password_change_required ?? false
          })
          console.log('Loaded security settings from localStorage')
        }
        return
      }

      // Table exists, try to load user settings
      const { data, error } = await supabase
        .from('user_security')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - use default settings
          console.log('No security settings found, using defaults')
          return
        }
        console.error('Error loading security settings:', error)
        return
      }

      if (data) {
        setSecurity({
          two_factor_enabled: data.two_factor_enabled ?? false,
          session_timeout: data.session_timeout ?? 30,
          login_notifications: data.login_notifications ?? true,
          password_change_required: data.password_change_required ?? false
        })
      }
    } catch (error) {
      console.error('Error loading security settings:', error)
      // Keep default security settings on any error
    }
  }

  const handleProfileUpdate = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()
      const sessionEmail = userData?.user?.email || ''
      
      // Build update payload only with columns that exist in DB to avoid 400s
      const candidate: Record<string, any> = {
        id: profile.id,
        email: profile.email || sessionEmail,
        full_name: profile.full_name,
        phone: profile.phone,
        bio: profile.bio,
        company_name: profile.company_name,
        website: profile.website,
        location: profile.location,
        timezone: profile.timezone,
        language: profile.language,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      }
      const payload = Object.fromEntries(Object.entries(candidate).filter(([key]) => key === 'id' || profileColumns.includes(key)))

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(payload)

      if (profileError) throw profileError

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        // Update profile with new avatar URL
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', profile.id)

        setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
        setAvatarFile(null)
        setAvatarPreview('')
      }

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      
      // First check if table exists
      const { error: tableCheckError } = await supabase
        .from('user_notifications')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        // Table doesn't exist - save to localStorage as fallback
        saveToLocalStorage('user_notifications', notifications)
        toast.info('Notification settings saved locally (database table not available)')
        setSaving(false)
        return
      }

      // Table exists, try to save
      const { error } = await supabase
        .from('user_notifications')
        .upsert({
          user_id: user.id,
          ...notifications,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating notification settings:', error)
        toast.error('Failed to update notification settings')
      } else {
        toast.success('Notification settings updated')
      }
    } catch (error) {
      console.error('Error updating notifications:', error)
      toast.error('Failed to update notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSecurityUpdate = async () => {
    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      
      // First check if table exists
      const { error: tableCheckError } = await supabase
        .from('user_security')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        // Table doesn't exist - save to localStorage as fallback
        saveToLocalStorage('user_security', security)
        toast.info('Security settings saved locally (database table not available)')
        setSaving(false)
        return
      }

      // Table exists, try to save
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: user.id,
          ...security,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating security settings:', error)
        toast.error('Failed to update security settings')
      } else {
        toast.success('Security settings updated')
      }
    } catch (error) {
      console.error('Error updating security:', error)
      toast.error('Failed to update security settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      toast.success('Password updated successfully')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Settings</h1>
            <p className="text-gray-200 text-lg mb-4">Manage your account settings and preferences</p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>Account: {profile?.full_name || 'User'}</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                <span>Security: {security.two_factor_enabled ? 'Enhanced' : 'Standard'}</span>
              </div>
              <div className="flex items-center">
                <Bell className="h-4 w-4 mr-1" />
                <span>Notifications: {notifications.email_notifications ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      src={avatarPreview || profile?.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors" title="Upload profile photo">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </label>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Profile Photo</h3>
                <p className="text-sm text-gray-500">Upload a new profile photo</p>
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={profile?.company_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profile?.website || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile?.location || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile?.bio || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={profile?.timezone || 'UTC'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, timezone: value } : null)}
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
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  value={profile?.language || 'en'}
                  onValueChange={(value) => setProfile(prev => prev ? { ...prev, language: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleProfileUpdate} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how and when you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email_notifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                </div>
                <Switch
                  checked={notifications.push_notifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                  <p className="text-sm text-gray-500">Receive notifications via text message</p>
                </div>
                <Switch
                  checked={notifications.sms_notifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms_notifications: checked }))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Notification Types</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Booking Updates</h4>
                  <p className="text-sm text-gray-500">Get notified about booking status changes</p>
                </div>
                <Switch
                  checked={notifications.booking_updates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, booking_updates: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Payment Notifications</h4>
                  <p className="text-sm text-gray-500">Get notified about payment activities</p>
                </div>
                <Switch
                  checked={notifications.payment_notifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, payment_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Marketing Emails</h4>
                  <p className="text-sm text-gray-500">Receive promotional and marketing content</p>
                </div>
                <Switch
                  checked={notifications.marketing_emails}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing_emails: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Weekly Reports</h4>
                  <p className="text-sm text-gray-500">Receive weekly summary reports</p>
                </div>
                <Switch
                  checked={notifications.weekly_reports}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weekly_reports: checked }))}
                />
              </div>
            </div>

            <Button onClick={handleNotificationUpdate} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  placeholder="Enter your new password"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder="Confirm your new password"
                />
              </div>

              <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure your account security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={security.two_factor_enabled}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, two_factor_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Login Notifications</h3>
                  <p className="text-sm text-gray-500">Get notified about new login attempts</p>
                </div>
                <Switch
                  checked={security.login_notifications}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, login_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Password Change Required</h3>
                  <p className="text-sm text-gray-500">Force password change on next login</p>
                </div>
                <Switch
                  checked={security.password_change_required}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, password_change_required: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                <Select
                  value={security.session_timeout.toString()}
                  onValueChange={(value) => setSecurity(prev => ({ ...prev, session_timeout: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSecurityUpdate} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Display & Preferences</CardTitle>
            <CardDescription>Customize your experience and interface preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select defaultValue="system">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="OMR">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OMR">OMR (ر.ع.)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-center py-8">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">More customization options coming soon</p>
              <p className="text-sm text-gray-500">Theme switching, layout preferences, and more</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
