'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Edit, 
  Save, 
  X, 
  Calendar,
  Award,
  Shield,
  CheckCircle,
  AlertCircle,
  Crown,
  Sparkles,
  Target,
  Settings,
  FileText,
  Briefcase,
  GraduationCap,
  Languages,
  Star,
  Building2,
  Link,
  Camera,
  Upload
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LogoUpload } from '@/components/ui/logo-upload'
import { calculateExperienceYears } from '@/lib/metrics'

interface ProviderProfile {
  id: string
  full_name: string
  email?: string
  phone: string
  country: string
  role: string
  is_verified: boolean
  created_at: string
  updated_at: string
  avatar_url?: string
  bio?: string
  skills?: string[]
  experience_years?: number
  education?: string
  languages?: string[]
  portfolio_url?: string
  linkedin_url?: string
  website_url?: string
  logo_url?: string
}

interface Company {
  id: string
  name: string
  cr_number: string
  vat_number: string
  logo_url: string
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const router = useRouter()

  // Form state for editing
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    country: '',
    bio: '',
    skills: [] as string[],
    experience_years: 0,
    education: '',
    languages: [] as string[],
    portfolio_url: '',
    linkedin_url: '',
    website_url: ''
  })

  const [newSkill, setNewSkill] = useState('')
  const [newLanguage, setNewLanguage] = useState('')

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUserEmail(user.email || '')
      const role = user.user_metadata?.role || 'client'
      setUserRole(role)

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Profile fetch error:', profileError)
        if (profileError.code === '57014') {
          setError('Profile data is taking too long to load. Please try again.')
        } else {
          setError('Failed to load profile data')
        }
        return
      }

      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          country: profileData.country || '',
          bio: profileData.bio || '',
          skills: profileData.skills || [],
          experience_years: profileData.experience_years || 0,
          education: profileData.education || '',
          languages: profileData.languages || [],
          portfolio_url: profileData.portfolio_url || '',
          linkedin_url: profileData.linkedin_url || '',
          website_url: profileData.website_url || ''
        })
      }

      // Fetch company data for both providers and clients
      if (role === 'provider' || role === 'client') {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        
        if (companyError) {
          console.warn('Company fetch error:', companyError)
        } else if (companyData) {
          setCompany(companyData)
        }
      }

      // Calculate profile completion
      calculateProfileCompletion(profileData, role)

    } catch (err) {
      console.error('Error fetching profile data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const calculateProfileCompletion = (profileData: any, role: string) => {
    let completion = 0
    const fields = ['full_name', 'phone', 'country', 'bio']
    
    if (profileData) {
      fields.forEach(field => {
        if (profileData[field]) completion += 15
      })
      
      if (profileData.skills && profileData.skills.length > 0) completion += 10
      if (profileData.experience_years) completion += 10
      if (profileData.education) completion += 10
      if (profileData.languages && profileData.languages.length > 0) completion += 10
      if (profileData.portfolio_url) completion += 10
    }
    
    if ((role === 'provider' || role === 'client') && company) {
      completion += 15
    }
    
    setProfileCompletion(Math.min(completion, 100))
  }

  const handleSave = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Read current row to discover available columns and avoid 400s
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError

      const allowedKeys = Object.keys(existing || {})
      const candidate: Record<string, any> = {
        full_name: formData.full_name,
        phone: formData.phone,
        country: formData.country,
        bio: formData.bio,
        skills: formData.skills,
        experience_years: formData.experience_years,
        education: formData.education,
        languages: formData.languages,
        portfolio_url: formData.portfolio_url,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url,
        updated_at: new Date().toISOString()
      }
      const payload = Object.fromEntries(
        Object.entries(candidate).filter(([key]) => allowedKeys.includes(key))
      )

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)

      if (error) throw error

      setSuccess('Profile updated successfully!')
      setEditing(false)
      fetchProfileData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    })
  }

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData({
        ...formData,
        languages: [...formData.languages, newLanguage.trim()]
      })
      setNewLanguage('')
    }
  }

  const removeLanguage = (language: string) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter(l => l !== language)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <Button onClick={fetchProfileData} variant="outline">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.full_name || userEmail || 'U').charAt(0).toUpperCase()}
              </div>
              {profile?.is_verified && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {profile?.full_name || 'Your Name'}
              </h1>
              <p className="text-gray-600 text-lg">
                {userRole === 'provider' ? 'Professional Service Provider' : 'Client'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(profile?.created_at || '')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {profileCompletion}% Complete
                </span>
                {profile?.is_verified && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <Shield className="h-4 w-4" />
                      Verified
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => setEditing(!editing)}
              variant="outline"
            >
              {editing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
            
            <Button onClick={() => router.push('/dashboard/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Enter your country"
                  />
                </div>
                <div>
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{userEmail}</p>
                    <p className="text-sm text-gray-500">Email Address</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{profile?.phone || 'Not specified'}</p>
                    <p className="text-sm text-gray-500">Phone Number</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{profile?.country || 'Not specified'}</p>
                    <p className="text-sm text-gray-500">Location</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{calculateExperienceYears(profile?.created_at, profile?.experience_years)} years</p>
                    <p className="text-sm text-gray-500">Experience</p>
                  </div>
                </div>
              </div>
              
              {profile?.bio && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">About</h4>
                  <p className="text-gray-600">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Upload your company logo to personalize your dashboard and sign-in experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            currentLogoUrl={userRole === 'provider' ? company?.logo_url : profile?.logo_url}
            onLogoChange={(logoUrl) => {
              if (userRole === 'provider') {
                setCompany(prev => prev ? { ...prev, logo_url: logoUrl } : null)
              } else {
                setProfile(prev => prev ? { ...prev, logo_url: logoUrl } : null)
              }
            }}
            userId={profile?.id || ''}
            userRole={userRole as 'provider' | 'client'}
          />
        </CardContent>
      </Card>

      {/* Professional Information */}
      {userRole === 'provider' && (
        <>
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills & Expertise
              </CardTitle>
              <CardDescription>Your professional skills and areas of expertise</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button onClick={addSkill} variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">No skills added yet</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Add your skills to help clients find and hire you for relevant projects
                      </p>
                      <Button 
                        onClick={() => setEditing(true)} 
                        variant="outline"
                        size="sm"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Add Your First Skill
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Languages
              </CardTitle>
              <CardDescription>Languages you can communicate in</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Add a language"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                    />
                    <Button onClick={addLanguage} variant="outline">
                      <Languages className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((language) => (
                      <Badge key={language} variant="secondary" className="flex items-center gap-1">
                        {language}
                        <button
                          onClick={() => removeLanguage(language)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.languages && profile.languages.length > 0 ? (
                    profile.languages.map((language) => (
                      <Badge key={language} variant="secondary">
                        {language}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Languages className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">No languages added yet</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Adding languages helps clients know how to communicate with you effectively
                      </p>
                      <Button 
                        onClick={() => setEditing(true)} 
                        variant="outline"
                        size="sm"
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        Add Languages
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <CardDescription>Your educational background</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div>
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({...formData, education: e.target.value})}
                    placeholder="Describe your educational background..."
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  {profile?.education ? (
                    <p className="text-gray-600">{profile.education}</p>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">No education information added yet</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Share your educational background to build trust with potential clients
                      </p>
                      <Button 
                        onClick={() => setEditing(true)} 
                        variant="outline"
                        size="sm"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Add Education
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Professional Links
              </CardTitle>
              <CardDescription>Your portfolio and professional profiles</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="portfolio_url">Portfolio URL</Label>
                    <Input
                      id="portfolio_url"
                      value={formData.portfolio_url}
                      onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile?.portfolio_url && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Portfolio
                      </a>
                    </div>
                  )}
                  {profile?.linkedin_url && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {profile?.website_url && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                  {!profile?.portfolio_url && !profile?.linkedin_url && !profile?.website_url && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Link className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">No professional links added yet</p>
                      <p className="text-gray-500 text-sm mb-4">
                        Add your portfolio, LinkedIn, or website to showcase your work and credibility
                      </p>
                      <Button 
                        onClick={() => setEditing(true)} 
                        variant="outline"
                        size="sm"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Add Professional Links
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Company Information */}
      {userRole === 'provider' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Your business details and company information</CardDescription>
          </CardHeader>
          <CardContent>
            {company ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <p className="text-gray-600">Registered Company</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600">Verified Business</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{company.cr_number}</p>
                      <p className="text-sm text-gray-500">CR Number</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{company.vat_number || '0'}</p>
                      <p className="text-sm text-gray-500">VAT Number</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{formatDate(company.created_at)}</p>
                      <p className="text-sm text-gray-500">Established</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Information</h3>
                <p className="text-gray-500 mb-4">Add your company details to enhance your profile</p>
                <Button onClick={() => router.push('/dashboard/company')}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button for Editing */}
      {editing && (
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}