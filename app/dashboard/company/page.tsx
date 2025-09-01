'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'

import { formatDate } from '@/lib/utils'
import { 
  Building2, 
  Edit, 
  Save, 
  X, 
  Plus,
  CheckCircle,
  AlertCircle,
  Upload,
  Globe,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users,
  Sparkles,
  Shield,
  TrendingUp,
  Award,
  Star
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string
  owner_id?: string
  name: string
  description?: string
  cr_number?: string
  vat_number?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  industry?: string
  size?: string
  founded_year?: number
  portfolio_links?: string
  services_offered?: string
  created_at: string
  updated_at?: string
  
  // Database field mappings
  registration_number?: string  // Maps to cr_number
  business_type?: string        // Maps to size
}

interface CompanyForm {
  name: string
  description?: string
  cr_number?: string
  vat_number?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  industry?: string
  size?: string
  founded_year?: number
  logo_url?: string
}

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null)
  
  // Debug: Log company state changes
  useEffect(() => {
    console.log('Company state changed:', company)
  }, [company])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<CompanyForm>({
    name: '',
    description: '',
    cr_number: '',
    vat_number: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    size: '',
    founded_year: new Date().getFullYear(),
    logo_url: ''
  })
  
  // Debug: Log form state changes
  useEffect(() => {
    console.log('Form state changed:', form)
  }, [form])
  
  // Sync form with company data when company changes
  useEffect(() => {
    if (company && !editing && !creating) {
      console.log('Syncing form with company data:', company)
      setForm({
        name: company.name || '',
        description: company.description || '',
        cr_number: company.registration_number || company.cr_number || '',
        vat_number: company.vat_number || '',
        address: typeof company.address === 'object' ? JSON.stringify(company.address) : company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        industry: company.industry || '',
        size: company.business_type || company.size || '',
        founded_year: typeof company.founded_year === 'number' ? company.founded_year : new Date().getFullYear(),
        logo_url: company.logo_url || ''
      })
    }
  }, [company, editing, creating])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showCreateCompany, setShowCreateCompany] = useState(false)


  // Helper function to safely render company data values
  const safeRenderValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'object') {
      // If it's a JSON object, try to stringify it
      try {
        const stringified = JSON.stringify(value)
        // If it's an empty object, return empty string
        if (stringified === '{}') return ''
        return stringified
      } catch {
        return '[Complex Data]'
      }
    }
    return String(value)
  }

  // Helper function to format company size labels
  const getCompanySizeLabel = (businessType: string) => {
    switch (businessType) {
      case 'small_business':
        return 'Small Business'
      case 'medium_business':
        return 'Medium Business'
      case 'large_business':
        return 'Large Business'
      case 'enterprise':
        return 'Enterprise'
      case 'startup':
        return 'Startup'
      case 'freelancer':
        return 'Freelancer'
      default:
        return businessType
    }
  }



  // Helper function to validate form data
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Check required fields
    if (!form.name.trim()) {
      errors.push('Company name is required')
    }
    
    // Check email format if provided
    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email.trim())) {
        errors.push('Please enter a valid email address')
      }
    }
    
    // Check website format if provided
    if (form.website && form.website.trim()) {
      if (!form.website.trim().startsWith('http://') && !form.website.trim().startsWith('https://')) {
        errors.push('Website must start with http:// or https://')
      }
    }
    
    // Check founded year if provided
    if (form.founded_year && (form.founded_year < 1900 || form.founded_year > new Date().getFullYear())) {
      errors.push('Founded year must be between 1900 and current year')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Helper function to check email conflicts
  const checkEmailConflict = async (email: string): Promise<boolean> => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('email', email.trim())
        .neq('id', company?.id || '')
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking email conflict:', error)
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('Error checking email conflict:', error)
      return false
    }
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, JPEG, SVG)')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, JPEG, SVG)')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogoToStorage = async (): Promise<string | null> => {
    if (!logoFile) return null

    try {
      setUploadingLogo(true)
      
      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `company-logos/${fileName}`

      // Upload to Supabase storage
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading logo:', error)
        alert('Failed to upload logo. Please try again.')
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo. Please try again.')
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeOldLogo = async (logoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = logoUrl.split('/')
      const filePath = urlParts.slice(-2).join('/') // Get last two parts for company-logos/filename
      
      // Remove from storage
      const supabase = await getSupabaseClient()
      const { error } = await supabase.storage
        .from('company-assets')
        .remove([`company-logos/${filePath}`])
      
      if (error) {
        console.error('Error removing old logo:', error)
      }
    } catch (error) {
      console.error('Error removing old logo:', error)
    }
  }

  useEffect(() => {
    console.log('CompanyPage useEffect triggered')
    fetchCompanyData()
  }, [])

  const fetchCompanyData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Fetching company data for user:', user.id)

      // First, try to get company through profile.company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      console.log('User profile:', profile)

      let companyData = null

      if (profile?.company_id) {
        // Try to get company through profile.company_id
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single()

        if (companyError) {
          console.log('Error fetching company through profile.company_id:', companyError.message)
        } else if (company) {
          companyData = company
          console.log('Company found through profile.company_id:', company.name)
        }
      }

      // If no company found through profile, try to find company where user is owner
      if (!companyData) {
        console.log('No company found through profile, checking if user owns a company...')
        const { data: ownedCompany, error: ownedError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (ownedError) {
          console.log('Error fetching owned company:', ownedError.message)
        } else if (ownedCompany) {
          companyData = ownedCompany
          console.log('Company found through owner_id:', ownedCompany.name)
          
          // Update profile with company_id for future reference
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ company_id: ownedCompany.id })
            .eq('id', user.id)
          
          if (updateError) {
            console.log('Warning: Could not update profile with company_id:', updateError.message)
          } else {
            console.log('Profile updated with company_id')
          }
        }
      }

      if (companyData) {
        console.log('Company data fetched successfully:', companyData)
        setCompany(companyData)
        
        // Initialize form with company data, mapping database fields to form fields
        setForm({
          name: companyData.name || '',
          description: companyData.description || '',
          cr_number: companyData.registration_number || companyData.cr_number || '',
          vat_number: companyData.vat_number || '',
          address: typeof companyData.address === 'object' ? JSON.stringify(companyData.address) : companyData.address || '',
          phone: companyData.phone || '',
          email: companyData.email || '',
          website: companyData.website || '',
          industry: companyData.industry || '',
          size: companyData.business_type || companyData.size || '',
          founded_year: typeof companyData.founded_year === 'number' ? companyData.founded_year : new Date().getFullYear(),
          logo_url: companyData.logo_url || ''
        })
        
        // Debug: Log what was set in the form
        console.log('Form initialized with company data:')
        console.log('  name:', companyData.name || '')
        console.log('  description:', companyData.description || '')
        console.log('  industry:', companyData.industry || '')
        console.log('  size:', companyData.size || '')
        console.log('  founded_year:', typeof companyData.founded_year === 'number' ? companyData.founded_year : new Date().getFullYear())
        console.log('  logo_url:', companyData.logo_url || '')
      } else {
        console.log('No company found for user')
        // Show option to create company
        setShowCreateCompany(true)
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      // Show option to create company if there's an error
      setShowCreateCompany(true)
    } finally {
      setLoading(false)
    }
  }

  const createCompany = async () => {
    try {
      setCreating(true)
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, ensure the user has a profile
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileCheckError)
        toast.error('Failed to verify user profile')
        return
      }

      // If no profile exists, create one
      if (!existingProfile) {
        console.log('Creating missing profile for user:', user.email)
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User',
            role: user.user_metadata?.role || 'client',
            phone: user.user_metadata?.phone || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileCreateError) {
          console.error('Profile creation error:', profileCreateError)
          toast.error(`Profile creation failed: ${profileCreateError.message}`)
          return
        }
        console.log('Profile created successfully')
      }

      // Now create company with basic info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          owner_id: user.id,
          name: (user.user_metadata?.full_name || 'User') + ' Company',
          description: 'Company created during onboarding',
          cr_number: null,
          vat_number: null
        })
        .select()
        .single()

      if (companyError) {
        console.error('Company creation error:', companyError)
        toast.error(`Company creation failed: ${companyError.message}`)
        return
      }

      // Update profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        toast.error(`Profile update failed: ${profileError.message}`)
        return
      }

      toast.success('Company created successfully!')
      setCompany(company)
      setShowCreateCompany(false)
      
      // Refresh company data
      await fetchCompanyData()
    } catch (error) {
      console.error('Error creating company:', error)
      toast.error('Failed to create company')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateCompany = async () => {
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)
      
      // Validate form data first
      const validation = validateForm()
      if (!validation.isValid) {
        setError(`Please fix the following errors:\n${validation.errors.join('\n')}`)
        setSubmitting(false)
        return
      }
      
      // Check for email conflict if email is provided
      if (form.email && form.email.trim()) {
        const isConflict = await checkEmailConflict(form.email.trim())
        if (isConflict) {
          setError('Email address is already in use by another company.')
          setSubmitting(false)
          return
        }
      }
      
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upload logo if file is selected
      let logoUrl = form.logo_url
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogoToStorage()
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl
        }
      }

      // Prepare company data with minimal required fields first
      const companyData = {
        owner_id: user.id,
        name: form.name,
        // Only include fields that we know exist
        description: form.description || null,
        logo_url: logoUrl || null,
      }

      console.log('Attempting to create company with minimal data:', companyData)

      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()

      if (error) {
        console.error('Error creating company:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        setError(`Failed to create company: ${error.message}`)
        return
      }

      console.log('Company created successfully:', newCompany)

      // Update user profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: newCompany.id })
        .eq('id', user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        setError('Company created but failed to link to profile')
      } else {
        setSuccess('Company created successfully!')
      }

      setCompany(newCompany)
      setCreating(false)
      setEditing(false)
      
      // Clear file state
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error) {
      console.error('Error creating company:', error)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!company) {
      setError('No company data available')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (!form.name.trim()) {
        setError('Company name is required')
        return
      }

      let logoUrl = form.logo_url
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogoToStorage()
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl
        }
      }

      const updateData = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        cr_number: form.cr_number?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        website: form.website?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        size: form.size?.trim() || undefined,
        founded_year: form.founded_year || undefined,
        logo_url: logoUrl || undefined
      }

      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id)

      if (error) {
        setError(`Failed to update company: ${error.message}`)
        return
      }

      setCompany(prev => {
        const updatedCompany = prev ? { 
          ...prev, 
          ...updateData,
          // Ensure all optional fields are undefined instead of null
          description: updateData.description || undefined,
          cr_number: updateData.cr_number || undefined,
          vat_number: updateData.vat_number || undefined,
          address: updateData.address || undefined,
          phone: updateData.phone || undefined,
          email: updateData.email || undefined,
          website: updateData.website || undefined,
          industry: updateData.industry || undefined,
          size: updateData.size || undefined,
          founded_year: updateData.founded_year || undefined,
          logo_url: updateData.logo_url || undefined
        } : null
        
        console.log('Updating company state:', updatedCompany)
        return updatedCompany
      })
      setLogoFile(null)
      setLogoPreview(null)
      setEditing(false)
      setSuccess('Company updated successfully!')
    } catch (error) {
      console.error('Error updating company:', error)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (company) {
      // Reset form to current company data
      setForm({
        name: company.name || '',
        description: company.description || '',
        cr_number: company.registration_number || company.cr_number || '',
        vat_number: company.vat_number || '',
        address: typeof company.address === 'object' ? JSON.stringify(company.address) : company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        industry: company.industry || '',
        size: company.business_type || company.size || '',
        founded_year: typeof company.founded_year === 'number' ? company.founded_year : new Date().getFullYear(),
        logo_url: company.logo_url || ''
      })
    } else {
      // Reset form to default values
      setForm({
        name: '',
        description: '',
        cr_number: '',
        vat_number: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        industry: '',
        size: '',
        founded_year: new Date().getFullYear(),
        logo_url: ''
      })
    }
    setLogoFile(null)
    setLogoPreview(null)
    setCreating(false)
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Company Management</h1>
              <p className="text-blue-100 text-lg mt-1">
                Establish your professional business presence
              </p>
            </div>
          </div>
          
          {!company && !creating && (
            <div className="flex items-center space-x-4 mt-6">
              <Button 
                size="lg" 
                onClick={() => setCreating(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Launch Your Company
              </Button>
              <div className="text-blue-100 text-sm">
                <Star className="h-4 w-4 inline mr-1" />
                Join 500+ companies already established
              </div>
            </div>
          )}
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      {!company && !creating ? (
        /* Enhanced No Company State */
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Launch Your Company?</h3>
              <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                Establish your professional business presence with a complete company profile. 
                Showcase your expertise, build trust with clients, and unlock new business opportunities.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Professional Credibility</h4>
                  <p className="text-sm text-gray-600">Build trust with verified business information</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Business Growth</h4>
                  <p className="text-sm text-gray-600">Attract more clients and opportunities</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Industry Recognition</h4>
                  <p className="text-sm text-gray-600">Stand out in your professional field</p>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => setCreating(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 text-lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Start Building Your Company Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : creating || editing ? (
        /* Enhanced Company Form */
        <div className="max-w-6xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">
                    {creating ? 'Launch Your Company' : 'Update Company Profile'}
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    {creating 
                      ? 'Create a comprehensive company profile to establish your business presence'
                      : 'Update your company information and keep it current'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {/* Company Form */}
              {(creating || editing) && (
                <Card className="border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      {creating ? (
                        <>
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Plus className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-gray-900">Launch Your Company</div>
                            <div className="text-sm font-normal text-gray-600 mt-1">
                              Complete your company profile to get started
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Edit className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-gray-900">Edit Company Profile</div>
                            <div className="text-sm font-normal text-gray-600 mt-1">
                              Update your company information
                            </div>
                          </div>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={(e) => { e.preventDefault(); creating ? handleCreateCompany() : handleUpdateCompany(e) }}>
                      {/* Company Logo Section */}
                      <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Upload className="h-4 w-4 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
                        </div>
                        
                        <div className="flex items-start space-x-6">
                          {/* Logo Preview */}
                          <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo Preview" 
                                className="w-28 h-28 object-cover rounded-lg"
                              />
                            ) : form.logo_url ? (
                              <img 
                                src={form.logo_url} 
                                alt="Current Logo" 
                                className="w-28 h-28 object-cover rounded-lg"
                              />
                            ) : (
                              <Upload className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Logo Upload Controls */}
                          <div className="flex-1 space-y-4">
                            {/* File Upload */}
                            <div className="space-y-2">
                              <Label htmlFor="logo_file" className="text-sm font-semibold text-gray-700">
                                Upload Logo File
                              </Label>
                              <div 
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                                  dragActive 
                                    ? 'border-blue-400 bg-blue-50' 
                                    : 'border-gray-300 hover:border-blue-400'
                                }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                              >
                                <input
                                  id="logo_file"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoFileChange}
                                  className="hidden"
                                />
                                <label htmlFor="logo_file" className="cursor-pointer">
                                  <div className="text-center">
                                    <Upload className={`mx-auto h-8 w-8 mb-2 ${
                                      dragActive ? 'text-blue-500' : 'text-gray-400'
                                    }`} />
                                    <p className="text-sm text-gray-600">
                                      <span className="text-blue-600 hover:text-blue-500 font-medium">
                                        Click to upload
                                      </span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      PNG, JPG, JPEG, SVG up to 5MB
                                    </p>
                                  </div>
                                </label>
                              </div>
                              {logoFile && (
                                <div className="flex items-center space-x-2 text-xs text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>{logoFile.name} selected</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setLogoFile(null)
                                      setLogoPreview(null)
                                    }}
                                    className="h-4 px-2 text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Or URL Input */}
                            <div className="space-y-2">
                              <Label htmlFor="logo_url" className="text-sm font-semibold text-gray-700">
                                Or Enter Logo URL
                              </Label>
                              <Input
                                id="logo_url"
                                value={form.logo_url || ''}
                                onChange={(e) => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                                placeholder="https://example.com/logo.png"
                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                disabled={!!logoFile}
                              />
                              <p className="text-xs text-gray-500">
                                Enter a direct URL to your company logo image (PNG, JPG, or SVG recommended)
                              </p>
                              {form.logo_url && !logoFile && (
                                <div className="flex items-center space-x-2 text-xs text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Logo URL provided</span>
                                </div>
                              )}
                            </div>

                            {/* Upload Status */}
                            {uploadingLogo && (
                              <div className="flex items-center space-x-2 text-xs text-blue-600">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                <span>Uploading logo...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company Identity Section */}
                      <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Company Identity</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              Company Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              value={form.name}
                              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter your company name"
                              className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg ${
                                !form.name.trim() ? 'border-red-300 bg-red-50' : ''
                              }`}
                            />
                            {!form.name.trim() && (
                              <p className="text-xs text-red-600">Company name is required</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="industry" className="text-sm font-semibold text-gray-700">
                              Industry
                            </Label>
                            <select
                              id="industry"
                              value={form.industry}
                              onChange={(e) => setForm(prev => ({ ...prev, industry: e.target.value }))}
                              className="h-12 w-full border border-gray-200 rounded-md px-3 focus:border-blue-500 focus:ring-blue-500"
                              aria-label="Select company industry"
                            >
                              <option value="">Select Industry</option>
                              <option value="Digital Marketing">Digital Marketing</option>
                              <option value="Legal Services">Legal Services</option>
                              <option value="Accounting">Accounting</option>
                              <option value="IT Services">IT Services</option>
                              <option value="Design & Branding">Design & Branding</option>
                              <option value="Consulting">Consulting</option>
                              <option value="Translation">Translation</option>
                              <option value="HR Services">HR Services</option>
                              <option value="Web Development">Web Development</option>
                              <option value="Content Creation">Content Creation</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                            Company Description
                          </Label>
                          <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe your company, services, and what makes you unique..."
                            rows={4}
                            className="mt-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">This will be displayed to potential clients</p>
                        </div>
                      </div>

                      {/* Business Details Section */}
                      <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <FileText className="h-4 w-4 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="cr_number" className="text-sm font-semibold text-gray-700">
                              CR Number
                            </Label>
                            <Input
                              id="cr_number"
                              value={form.cr_number}
                              onChange={(e) => setForm(prev => ({ ...prev, cr_number: e.target.value }))}
                              placeholder="Commercial Registration Number"
                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="vat_number" className="text-sm font-semibold text-gray-700">
                              VAT Number
                            </Label>
                            <Input
                              id="vat_number"
                              value={form.vat_number}
                              onChange={(e) => setForm(prev => ({ ...prev, vat_number: e.target.value }))}
                              placeholder="Value Added Tax Number"
                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="size" className="text-sm font-semibold text-gray-700">
                              Company Size
                            </Label>
                            <select
                              id="size"
                              value={form.size}
                              onChange={(e) => setForm(prev => ({ ...prev, size: e.target.value }))}
                              className="h-12 w-full border border-gray-200 rounded-md px-3 focus:border-blue-500 focus:ring-blue-500"
                              aria-label="Select company size"
                            >
                              <option value="">Select Company Size</option>
                              <option value="startup">Startup</option>
                              <option value="freelancer">Freelancer</option>
                              <option value="small_business">Small Business</option>
                              <option value="medium_business">Medium Business</option>
                              <option value="large_business">Large Business</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="founded_year" className="text-sm font-semibold text-gray-700">
                              Founded Year
                            </Label>
                            <Input
                              id="founded_year"
                              type="number"
                              value={form.founded_year}
                              onChange={(e) => setForm(prev => ({ ...prev, founded_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                              placeholder="Year founded"
                              min="1900"
                              max={new Date().getFullYear()}
                              className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                                form.founded_year && (form.founded_year < 1900 || form.founded_year > new Date().getFullYear())
                                  ? 'border-red-300 bg-red-50' 
                                  : ''
                              }`}
                            />
                            {form.founded_year && (form.founded_year < 1900 || form.founded_year > new Date().getFullYear()) && (
                              <p className="text-xs text-red-600">Founded year must be between 1900 and current year</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Phone className="h-4 w-4 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                              Business Phone
                            </Label>
                            <Input
                              id="phone"
                              value={form.phone}
                              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Company phone number"
                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                              Business Email
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Company email address"
                              className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                                form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) 
                                  ? 'border-red-300 bg-red-50' 
                                  : ''
                              }`}
                            />
                            {form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && (
                              <p className="text-xs text-red-600">Please enter a valid email address</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="website" className="text-sm font-semibold text-gray-700">
                              Company Website
                            </Label>
                            <Input
                              id="website"
                              value={form.website}
                              onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                              placeholder="https://yourcompany.com"
                              className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                                form.website && form.website.trim() && 
                                !form.website.trim().startsWith('http://') && 
                                !form.website.trim().startsWith('https://')
                                  ? 'border-red-300 bg-red-50' 
                                  : ''
                              }`}
                            />
                            {form.website && form.website.trim() && 
                              !form.website.trim().startsWith('http://') && 
                              !form.website.trim().startsWith('https://') && (
                              <p className="text-xs text-red-600">Website must start with http:// or https://</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                              Business Address
                            </Label>
                            <Textarea
                              id="address"
                              value={form.address}
                              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Your company's physical address"
                              rows={3}
                              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 inline mr-2 text-green-500" />
                          All information is secure and confidential
                        </div>
                        <div className="flex space-x-4">
                          <Button 
                            variant="outline" 
                            onClick={handleCancel} 
                            className="px-8 py-3 border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button 
                            onClick={creating ? handleCreateCompany : (e) => handleUpdateCompany(e)}
                            disabled={!form.name.trim() || submitting || uploadingLogo}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                          >
                            {submitting || uploadingLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {uploadingLogo ? 'Uploading Logo...' : 'Saving...'}
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {creating ? 'Launch Company' : 'Save Changes'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              
              {/* Form Progress Indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Form Completion</span>
                  <span>{(() => {
                    const formValues = Object.values(form);
                    console.log('Form values:', formValues);
                    const filledValues = formValues.filter(value => {
                      if (value === null || value === undefined) return false;
                      if (typeof value === 'string') return value.trim() !== '';
                      if (typeof value === 'number') return value > 0;
                      return false;
                    }).length;
                    return Math.round((filledValues / formValues.length) * 100);
                  })()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(() => {
                      const formValues = Object.values(form);
                      const filledValues = formValues.filter(value => {
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string') return value.trim() !== '';
                        if (typeof value === 'number') return value > 0;
                        return false;
                      }).length;
                      return Math.round((filledValues / formValues.length) * 100);
                    })()}%` }}
                  ></div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-800 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  <div className="whitespace-pre-line">{error}</div>
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md text-green-800 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  {success}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Enhanced Company Display */
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Company Overview Card */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                    {company?.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={`${company.name} Logo`} 
                        className="w-20 h-20 object-cover rounded-xl"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Building2 className={`h-12 w-12 text-white ${company?.logo_url ? 'hidden' : ''}`} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{safeRenderValue(company?.name) || 'Company Name'}</h2>
                    {company?.description && (
                      <p className="text-blue-100 text-lg mb-4 max-w-2xl">{safeRenderValue(company.description)}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {company?.industry && safeRenderValue(company.industry) ? (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {safeRenderValue(company.industry)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-white/10 text-white/70 border-white/20">
                          Industry not specified
                        </Badge>
                      )}
                      {company?.size && safeRenderValue(company.size) ? (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {getCompanySizeLabel(safeRenderValue(company.size))}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-white/10 text-white/70 border-white/20">
                          Size not specified
                        </Badge>
                      )}
                      {company?.founded_year && safeRenderValue(company.founded_year) ? (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          Est. {safeRenderValue(company.founded_year)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-white/10 text-white/70 border-white/20">
                          Year not specified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setEditing(true)}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                

              </div>
            </div>
          </Card>

          {/* Company Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Company Logo & Branding */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Upload className="h-5 w-5 text-purple-600" />
                  Company Logo & Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 mx-auto mb-4 overflow-hidden">
                    {company?.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={`${company.name} Logo`} 
                        className="w-28 h-28 object-cover rounded-xl"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Upload className={`h-12 w-12 text-gray-400 ${company?.logo_url ? 'hidden' : ''}`} />
                  </div>
                  {company?.logo_url ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">Logo Active</p>
                      <p className="text-xs text-gray-500">Your company logo is displayed</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditing(true)}
                        className="mt-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Update Logo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">No Logo Set</p>
                      <p className="text-xs text-gray-500">Add a logo to enhance your brand</p>
                      <Button 
                        size="sm" 
                        onClick={() => setEditing(true)}
                        className="mt-2"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Logo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Legal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">CR Number</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {safeRenderValue(company?.cr_number) || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">VAT Number</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {safeRenderValue(company?.vat_number) || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Established</span>
                    <span className="text-sm text-gray-600">
                      {safeRenderValue(company?.founded_year) || 'Not specified'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {safeRenderValue(company?.address) || 'Address not provided'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {safeRenderValue(company?.phone) || 'Phone not provided'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {safeRenderValue(company?.email) || 'Email not provided'}
                    </span>
                  </div>
                  {company?.website && safeRenderValue(company.website) && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a 
                        href={safeRenderValue(company.website)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {safeRenderValue(company.website)}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Statistics */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Company Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {company?.founded_year && safeRenderValue(company.founded_year) && !isNaN(parseInt(safeRenderValue(company.founded_year))) 
                      ? new Date().getFullYear() - parseInt(safeRenderValue(company.founded_year)) 
                      : 'N/A'}
                  </div>
                  <p className="text-sm text-blue-700 font-medium">Years in Business</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {company?.size && safeRenderValue(company.size) 
                      ? getCompanySizeLabel(safeRenderValue(company.size)) 
                      : 'Not specified'}
                  </div>
                  <p className="text-sm text-green-700 font-medium">Company Size</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {company?.created_at ? formatDate(company.created_at) : 'N/A'}
                  </div>
                  <p className="text-sm text-purple-700 font-medium">Added to Platform</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
