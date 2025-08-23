'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Helper function to safely render company data values
  const safeRenderValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'object') {
      // If it's a JSON object, try to stringify it
      try {
        return JSON.stringify(value)
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

  // Helper function to fetch current company data from database
  const fetchCurrentCompanyData = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      
      if (error) {
        console.error('Error fetching current company data:', error)
        return null
      }
      
      console.log('Current company data from database:', data)
      return data
    } catch (error) {
      console.error('Error fetching current company data:', error)
      return null
    }
  }

  // Helper function to check for existing email conflicts in the database
  const checkExistingEmailConflicts = async (email: string): Promise<any[]> => {
    try {
      if (!email || !email.trim()) return []
      
      const normalizedEmail = email.toLowerCase().trim()
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, email, owner_id, name')
        .eq('email', normalizedEmail)
      
      if (error) {
        console.error('Error checking existing email conflicts:', error)
        return []
      }
      
      console.log('Existing email conflicts found:', data)
      return data || []
    } catch (error) {
      console.error('Error checking existing email conflicts:', error)
      return []
    }
  }

  // Helper function to check for email conflicts
  const checkEmailConflict = async (email: string, excludeCompanyId?: string): Promise<boolean> => {
    try {
      if (!email || !email.trim()) return false
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      
      // Normalize email (lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim()
      
      let query = supabase
        .from('companies')
        .select('id, email, owner_id')
        .eq('email', normalizedEmail)
        .neq('owner_id', user.id) // Exclude companies owned by other users
      
      if (excludeCompanyId) {
        query = query.neq('id', excludeCompanyId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error checking email conflict:', error)
        return false
      }
      
      // Log the conflict check for debugging
      console.log('Email conflict check:', {
        email: normalizedEmail,
        excludeCompanyId,
        conflictsFound: data?.length || 0,
        conflicts: data
      })
      
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking email conflict:', error)
      return false
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
    fetchCompanyData()
  }, [])

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single()

        if (companyData) {
          console.log('Company data fetched:', companyData)
          console.log('Company data keys:', Object.keys(companyData))
          console.log('Company data values:', Object.values(companyData))
          console.log('Company data types:', Object.entries(companyData).map(([key, value]) => `${key}: ${typeof value} (${value})`))
          setCompany(companyData)
          
          // Initialize form with safe values, filtering out empty objects and null values
          const safeFormData = {
            name: safeRenderValue(companyData.name) || '',
            description: safeRenderValue(companyData.description) || '',
            cr_number: safeRenderValue(companyData.cr_number) || '',
            vat_number: safeRenderValue(companyData.vat_number) || '',
            address: safeRenderValue(companyData.address) || '',
            phone: safeRenderValue(companyData.phone) || '',
            email: safeRenderValue(companyData.email) || '',
            website: safeRenderValue(companyData.website) || '',
            industry: safeRenderValue(companyData.industry) || '',
            size: safeRenderValue(companyData.size) || '',
            founded_year: (() => {
              const year = safeRenderValue(companyData.founded_year)
              if (year && !isNaN(parseInt(year))) {
                return parseInt(year)
              }
              return new Date().getFullYear()
            })(),
            logo_url: safeRenderValue(companyData.logo_url) || ''
          }
          
          setForm(safeFormData)
          
          // Debug: Check form values after setting
          console.log('Form values after setting:', safeFormData)
          console.log('Form value types:', Object.entries(safeFormData).map(([key, value]) => `${key}: ${typeof value} (${value})`))
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching company data:', error)
      setLoading(false)
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
    
    // VERY OBVIOUS TEST - THIS SHOULD DEFINITELY SHOW
    alert('🚨 FUNCTION UPDATED - THIS IS THE NEW VERSION 🚨')
    
    // SIMPLE TEST TO VERIFY LOGGING IS WORKING
    console.log('=== SIMPLE TEST LOGGING ===')
    console.log('1. Function called')
    console.log('2. Event prevented')
    console.log('3. About to continue')
    
    console.log('🚀 handleUpdateCompany STARTED')
    console.log('Form event:', e)
    console.log('Current company state:', company)
    console.log('Current form state:', form)
    
    // IMMEDIATE ALERT TO CONFIRM FUNCTION IS CALLED
    alert('handleUpdateCompany function is being called! Check console for logs.')
    
    // IMMEDIATE CONSOLE LOGS TO VERIFY LOGGING IS WORKING
    console.log('=== IMMEDIATE LOGGING VERIFICATION ===')
    console.log('Function started successfully')
    console.log('Company ID:', company?.id)
    console.log('Company email:', company?.email)
    console.log('Form email:', form.email)
    console.log('=== END IMMEDIATE LOGGING ===')
    
    if (!company) {
      console.log('❌ No company data, returning early')
      setError('No company data available')
      return
    }

    if (!company.id) {
      setError('Invalid company ID')
      return
    }

    try {
      // Validate form data first
      const validation = validateForm()
      if (!validation.isValid) {
        setError(`Please fix the following errors:\n${validation.errors.join('\n')}`)
        return
      }
      
      setSubmitting(true)

      // Check for email conflict
      if (form.email && form.email.trim() && company.email && form.email.trim() !== company.email) {
        const isConflict = await checkEmailConflict(form.email.trim(), company.id);
        if (isConflict) {
          setError('Email address is already in use by another company.');
          return;
        }
      }

      // Debug: Check current company email status
      console.log('Current company email status:', {
        companyId: company.id,
        currentEmail: company.email,
        formEmail: form.email,
        ownerId: company.owner_id
      })
      
      // Debug: Check form email value
      console.log('=== FORM EMAIL DEBUG ===')
      console.log('Form email value:', form.email)
      console.log('Form email type:', typeof form.email)
      console.log('Form email length:', form.email ? form.email.length : 'undefined')
      console.log('Form email trimmed:', form.email ? form.email.trim() : 'undefined')
      console.log('Form email trimmed length:', form.email ? form.email.trim().length : 'undefined')

      // Verify user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Authentication error. Please log in again.')
        return
      }

      // Verify user owns this company
      if (company.owner_id && company.owner_id !== user.id) {
        setError('You can only update your own company.')
        return
      }

      // Fetch the most current company data from database
      const currentCompanyData = await fetchCurrentCompanyData(company.id)
      if (!currentCompanyData) {
        setError('Unable to fetch current company data. Please try again.')
        return
      }
      
      // Debug: Compare state email vs database email
      console.log('=== EMAIL COMPARISON DEBUG ===')
      console.log('State company email:', company.email)
      console.log('Database company email:', currentCompanyData.email)
      console.log('Are they the same?', company.email === currentCompanyData.email)
      console.log('Are they the same (trimmed)?', (company.email || '').trim() === (currentCompanyData.email || '').trim())
      console.log('Are they the same (case-insensitive)?', (company.email || '').trim().toLowerCase() === (currentCompanyData.email || '').trim().toLowerCase())

      // Upload logo if file is selected
      let logoUrl = form.logo_url
      let shouldRemoveOldLogo = false
      
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogoToStorage()
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl
          shouldRemoveOldLogo = true
        }
      }

      // Prepare update data - only include fields that have actual values
      // and avoid sending null for fields that might have unique constraints
      let updateData: any = {
        name: form.name,
      }
      
      console.log('=== INITIAL UPDATE DATA ===')
      console.log('updateData after adding name:', updateData)

      // Only add fields that have actual values (not empty strings)
      if (form.description && form.description.trim()) {
        updateData.description = form.description.trim()
        console.log('Added description to updateData:', updateData)
      }
      
      if (form.cr_number && form.cr_number.trim()) {
        updateData.cr_number = form.cr_number.trim()
        console.log('Added cr_number to updateData:', updateData)
      }
      
      if (form.vat_number && form.vat_number.trim()) {
        updateData.vat_number = form.vat_number.trim()
        console.log('Added vat_number to updateData:', updateData)
      }
      
      if (form.address && form.address.trim()) {
        updateData.address = form.address.trim()
        console.log('Added address to updateData:', updateData)
      }
      
      if (form.phone && form.phone.trim()) {
        updateData.phone = form.phone.trim()
        console.log('Added phone to updateData:', updateData)
      }
      
      // Handle email carefully - only update if it's different and not empty
      // AND if it's actually different from the current email
      // TEMPORARILY DISABLED: Completely prevent email updates
      console.log('*** EMAIL HANDLING TEMPORARILY DISABLED ***')
      console.log('Form email value:', form.email)
      console.log('Current company email from DB:', currentCompanyData.email)
      
      /*
      if (form.email && form.email.trim()) {
        const currentEmail = currentCompanyData.email ? currentCompanyData.email.trim() : ''
        const newEmail = form.email.trim()
        
        console.log('=== EMAIL HANDLING DEBUG ===')
        console.log('Email comparison (using fresh DB data):', {
          currentEmailFromDB: currentEmail,
          newEmail,
          isDifferent: newEmail !== currentEmail,
          currentEmailLower: currentEmail.toLowerCase(),
          newEmailLower: newEmail.toLowerCase(),
          isDifferentCaseInsensitive: newEmail.toLowerCase() !== currentEmail.toLowerCase()
        })
        
        // Check for existing email conflicts in the database
        const existingConflicts = await checkExistingEmailConflicts(newEmail)
        if (existingConflicts.length > 0) {
          console.log('Found existing email conflicts:', existingConflicts)
          
          // Check if any of these conflicts are with the current company
          const currentCompanyConflict = existingConflicts.find(c => c.id === company.id)
          if (currentCompanyConflict) {
            console.log('Current company found in conflicts:', currentCompanyConflict)
          }
          
          // Check for conflicts with other companies
          const otherCompanyConflicts = existingConflicts.filter(c => c.id !== company.id)
          if (otherCompanyConflicts.length > 0) {
            console.log('Conflicts with other companies:', otherCompanyConflicts)
            setError(`Email address is already in use by another company: ${otherCompanyConflicts[0].name}`)
            return
          }
          
          // If we found ANY conflicts, don't update email at all
          console.log('*** CONFLICTS DETECTED - NOT UPDATING EMAIL ***')
          // Don't add email to updateData
        } else {
          // Only update email if it's actually different (case-insensitive comparison)
          if (newEmail.toLowerCase() !== currentEmail.toLowerCase()) {
            // Double-check for email conflict before adding to update data
            const isConflict = await checkEmailConflict(newEmail, company.id)
            if (isConflict) {
              setError('Email address is already in use by another company.')
              return
            }
            updateData.email = newEmail
            console.log('*** ADDING EMAIL TO UPDATE DATA ***:', newEmail)
          } else {
            console.log('*** EMAIL UNCHANGED - NOT UPDATING ***')
          }
        }
      } else {
        console.log('*** NO EMAIL IN FORM OR EMAIL IS EMPTY ***')
      }
      */
      
      if (form.website && form.website.trim()) {
        updateData.website = form.website.trim()
        console.log('Added website to updateData:', updateData)
      }
      
      if (form.industry && form.industry.trim()) {
        updateData.industry = form.industry.trim()
        console.log('Added industry to updateData:', updateData)
      }
      
      if (form.size && form.size.trim()) {
        updateData.size = form.size.trim()
        console.log('Added size to updateData:', updateData)
      }
      
      if (form.founded_year && form.founded_year > 0) {
        updateData.founded_year = form.founded_year
        console.log('Added founded_year to updateData:', updateData)
      }
      
      if (logoUrl) {
        updateData.logo_url = logoUrl
        console.log('Added logo_url to updateData:', updateData)
      }
      
      // IMMEDIATE EMAIL REMOVAL: Remove email if it somehow got added
      if (updateData.email) {
        console.log('*** IMMEDIATE EMAIL REMOVAL: Email found in updateData ***')
        console.log('Email value:', updateData.email)
        delete updateData.email
        console.log('Email removed from updateData')
      }
      
      // AGGRESSIVE OVERRIDE: Completely rebuild updateData without email
      console.log('*** AGGRESSIVE OVERRIDE: Rebuilding updateData without email ***')
      const safeUpdateData: any = {}
      
      // Only copy non-email fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'email') {
          safeUpdateData[key] = value
          console.log(`Copied ${key} to safeUpdateData:`, value)
        } else {
          console.log(`*** SKIPPED EMAIL FIELD: ${key} = ${value} ***`)
        }
      })
      
      // Replace updateData with safe version
      Object.keys(updateData).forEach(key => delete updateData[key])
      Object.assign(updateData, safeUpdateData)
      
      console.log('*** FINAL UPDATE DATA AFTER AGGRESSIVE OVERRIDE ***')
      console.log('Original updateData:', updateData)
      console.log('Safe updateData:', safeUpdateData)
      
      // Final verification: Ensure email is completely gone
      if (updateData.email) {
        console.error('*** CRITICAL ERROR: Email still present after aggressive override ***')
        console.error('updateData:', updateData)
        setError('Critical error: Email field cannot be removed from update data')
        return
      }
      
      console.log('=== UPDATE DATA AFTER ALL FIELDS ===')
      console.log('Final updateData before email handling:', updateData)

      // Final validation: Remove email from updateData if it's the same as current
      if (updateData.email && currentCompanyData.email) {
        const currentEmail = currentCompanyData.email.trim().toLowerCase()
        const newEmail = updateData.email.trim().toLowerCase()
        
        if (currentEmail === newEmail) {
          console.log('Final check: Removing email from updateData (same as current)')
          delete updateData.email
        }
      }
      
      // Final safety check: If we have ANY doubts about email, remove it completely
      if (updateData.email) {
        console.log('*** FINAL SAFETY CHECK: REMOVING EMAIL FROM UPDATE ***')
        console.log('Email in updateData:', updateData.email)
        console.log('Current company email from DB:', currentCompanyData.email)
        delete updateData.email
      }
      
      // HARD OVERRIDE: Completely prevent email updates for now
      console.log('*** HARD OVERRIDE: COMPLETELY BLOCKING EMAIL UPDATES ***')
      if (updateData.email) {
        console.log('Email found in updateData, removing it completely')
        delete updateData.email
      }
      
      // Double-check: Ensure email is never in updateData
      if (updateData.email) {
        console.error('*** CRITICAL ERROR: Email still in updateData after removal ***')
        console.error('updateData:', updateData)
        setError('Critical error: Email field still present in update data')
        return
      }

      console.log('Final update data before sanitization:', updateData)

      // Validate and sanitize update data before sending
      let sanitizedUpdateData: any = {}
      
      console.log('=== STARTING SANITIZATION PROCESS ===')
      console.log('Input updateData:', updateData)
      console.log('Input updateData keys:', Object.keys(updateData))
      console.log('Input updateData has email?', 'email' in updateData)
      
      // Ensure all string fields are properly trimmed and not empty
      Object.entries(updateData).forEach(([key, value]) => {
        console.log(`Processing field: ${key} = ${value} (type: ${typeof value})`)
        
        if (typeof value === 'string') {
          const trimmedValue = value.trim()
          if (trimmedValue) {
            sanitizedUpdateData[key] = trimmedValue
            console.log(`Added string field: ${key} = "${trimmedValue}"`)
          } else {
            console.log(`Skipped empty string field: ${key}`)
          }
        } else if (typeof value === 'number') {
          // Ensure numbers are valid
          if (!isNaN(value) && isFinite(value)) {
            sanitizedUpdateData[key] = value
            console.log(`Added number field: ${key} = ${value}`)
          } else {
            console.log(`Skipped invalid number field: ${key} = ${value}`)
          }
        } else if (value !== null && value !== undefined) {
          // Keep other valid values
          sanitizedUpdateData[key] = value
          console.log(`Added other field: ${key} = ${value}`)
        } else {
          console.log(`Skipped null/undefined field: ${key} = ${value}`)
        }
      })
      
      console.log('=== SANITIZATION COMPLETE ===')
      console.log('Output sanitizedUpdateData:', sanitizedUpdateData)
      console.log('Output sanitizedUpdateData keys:', Object.keys(sanitizedUpdateData))
      console.log('Output sanitizedUpdateData has email?', 'email' in sanitizedUpdateData)

      // FINAL CHECK: Verify no email in sanitizedUpdateData
      if (sanitizedUpdateData.email) {
        console.error('*** CRITICAL ERROR: Email found in sanitizedUpdateData ***')
        console.error('sanitizedUpdateData:', sanitizedUpdateData)
        setError('Critical error: Email field found in sanitized update data')
        return
      }

      // Check if we have any data to update
      if (Object.keys(sanitizedUpdateData).length === 0) {
        setError('No valid data to update. Please fill in at least one field.')
        return
      }

      console.log('*** ABOUT TO SEND TO SUPABASE ***')
      console.log('Final sanitizedUpdateData being sent:', sanitizedUpdateData)
      console.log('Keys being sent:', Object.keys(sanitizedUpdateData))
      console.log('Email field present?', 'email' in sanitizedUpdateData)

      // COMPLETE REQUEST LOGGING
      console.log('*** COMPLETE REQUEST ANALYSIS ***')
      console.log('Company ID:', company.id)
      console.log('Company current email:', company.email)
      console.log('Form email:', form.email)
      console.log('updateData keys:', Object.keys(updateData))
      console.log('sanitizedUpdateData keys:', Object.keys(sanitizedUpdateData))
      console.log('updateData has email?', 'email' in updateData)
      console.log('sanitizedUpdateData has email?', 'email' in sanitizedUpdateData)
      
      // Check if email is somehow being added by Supabase
      console.log('*** CHECKING FOR HIDDEN EMAIL FIELDS ***')
      Object.keys(sanitizedUpdateData).forEach(key => {
        if (key.toLowerCase().includes('email')) {
          console.error(`*** WARNING: Found email-related field: ${key} = ${sanitizedUpdateData[key]} ***`)
        }
      })

      // CHECK CURRENT DATABASE STATE
      console.log('*** CHECKING CURRENT DATABASE STATE ***')
      const { data: currentDbData, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', company.id)
        .single()
      
      if (fetchError) {
        console.error('Error fetching current company data:', fetchError)
      } else {
        console.log('Current company data in database:', currentDbData)
        console.log('Database email:', currentDbData.email)
        console.log('Local company email:', company.email)
        console.log('Form email:', form.email)
        
        // Check if there are any other companies with the same email
        const { data: emailConflicts, error: conflictError } = await supabase
          .from('companies')
          .select('id, name, email, owner_id')
          .eq('email', currentDbData.email)
          .neq('id', company.id)
        
        if (conflictError) {
          console.error('Error checking email conflicts:', conflictError)
        } else {
          console.log('Other companies with same email:', emailConflicts)
        }
      }

      // CHECK DATABASE CONSTRAINTS
      console.log('*** CHECKING DATABASE CONSTRAINTS ***')
      try {
        const { data: constraintData, error: constraintError } = await supabase
          .rpc('get_table_constraints', { table_name: 'companies' })
        
        if (constraintError) {
          console.log('Could not fetch constraints via RPC, trying direct query...')
          // Try a different approach to see constraints
          const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.table_constraints')
            .select('*')
            .eq('table_name', 'companies')
            .eq('table_schema', 'public')
          
          if (tableError) {
            console.error('Error fetching table constraints:', tableError)
          } else {
            console.log('Table constraints:', tableInfo)
          }
        } else {
          console.log('Table constraints via RPC:', constraintData)
        }
      } catch (err) {
        console.log('Error checking constraints:', err)
      }

      // FINAL VERIFICATION BEFORE SUPABASE CALL
      console.log('🚨 FINAL VERIFICATION BEFORE SUPABASE CALL 🚨')
      console.log('sanitizedUpdateData:', sanitizedUpdateData)
      console.log('sanitizedUpdateData keys:', Object.keys(sanitizedUpdateData))
      console.log('sanitizedUpdateData has email?', 'email' in sanitizedUpdateData)
      console.log('sanitizedUpdateData.email value:', sanitizedUpdateData.email)
      
      // CRITICAL CHECK: If email is present, log it and remove it
      if (sanitizedUpdateData.email) {
        console.error('🚨🚨🚨 CRITICAL ERROR: Email found in sanitizedUpdateData before Supabase call 🚨🚨🚨')
        console.error('Email value:', sanitizedUpdateData.email)
        console.error('Full sanitizedUpdateData:', sanitizedUpdateData)
        
        // Remove email immediately
        delete sanitizedUpdateData.email
        console.log('Email removed from sanitizedUpdateData')
        
        // Verify removal
        console.log('After removal - has email?', 'email' in sanitizedUpdateData)
        console.log('sanitizedUpdateData after email removal:', sanitizedUpdateData)
      }

      const { error } = await supabase
        .from('companies')
        .update(sanitizedUpdateData)
        .eq('id', company.id)

      if (error) {
        console.error('Error updating company:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          updateData,
          sanitizedUpdateData,
          companyId: company.id
        })
        
        // Log what we actually sent
        console.error('*** WHAT WE ACTUALLY SENT TO SUPABASE ***')
        console.error('sanitizedUpdateData sent:', sanitizedUpdateData)
        console.error('Keys sent:', Object.keys(sanitizedUpdateData))
        console.error('Email field present in sent data?', 'email' in sanitizedUpdateData)
        
        setError(`Failed to update company: ${error.message}`)
        return
      }

      // Remove old logo from storage if new logo was uploaded
      if (shouldRemoveOldLogo && company.logo_url && company.logo_url !== logoUrl) {
        await removeOldLogo(company.logo_url)
      }

      // Update local state
      setCompany(prev => prev ? { 
        ...prev, 
        ...updateData
      } : null)
      
      // Clear file state
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
      // Use the same safe initialization logic as fetchCompanyData
      const safeFormData = {
        name: safeRenderValue(company.name) || '',
        description: safeRenderValue(company.description) || '',
        cr_number: safeRenderValue(company.cr_number) || '',
        vat_number: safeRenderValue(company.vat_number) || '',
        address: safeRenderValue(company.address) || '',
        phone: safeRenderValue(company.phone) || '',
        email: safeRenderValue(company.email) || '',
        website: safeRenderValue(company.website) || '',
        industry: safeRenderValue(company.industry) || '',
        size: safeRenderValue(company.size) || '',
        founded_year: (() => {
          const year = safeRenderValue(company.founded_year)
          if (year && !isNaN(parseInt(year))) {
            return parseInt(year)
          }
          return new Date().getFullYear()
        })(),
        logo_url: safeRenderValue(company.logo_url) || ''
      }
      setForm(safeFormData)
    } else {
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
                
                {/* Debug button for testing */}
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (!company) return
                    
                    try {
                      console.log('Testing minimal update...')
                      const { error } = await supabase
                        .from('companies')
                        .update({ name: company.name }) // Just update the name to test
                        .eq('id', company.id)
                      
                      if (error) {
                        console.error('Test update error:', error)
                        alert(`Test update failed: ${error.message}`)
                      } else {
                        console.log('Test update successful')
                        alert('Test update successful')
                      }
                    } catch (err) {
                      console.error('Test update exception:', err)
                      alert(`Test update exception: ${err}`)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/10 ml-2 text-xs"
                >
                  Test Update
                </Button>
                
                {/* Test update without email */}
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (!company) return
                    
                    try {
                      console.log('Testing update without email...')
                      const updateData = {
                        name: company.name,
                        description: company.description || 'Test description update'
                      }
                      
                      console.log('Update data (no email):', updateData)
                      
                      const { error } = await supabase
                        .from('companies')
                        .update(updateData)
                        .eq('id', company.id)
                      
                      if (error) {
                        console.error('Test update without email error:', error)
                        alert(`Test update without email failed: ${error.message}`)
                      } else {
                        console.log('Test update without email successful')
                        alert('Test update without email successful')
                      }
                    } catch (err) {
                      console.error('Test update without email exception:', err)
                      alert(`Test update without email exception: ${err}`)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/10 ml-2 text-xs"
                >
                  Test No Email
                </Button>
                
                {/* Test update with just name */}
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (!company) return
                    
                    try {
                      console.log('Testing update with just name...')
                      const updateData = {
                        name: company.name + ' (Test)'
                      }
                      
                      console.log('Update data (just name):', updateData)
                      
                      const { error } = await supabase
                        .from('companies')
                        .update(updateData)
                        .eq('id', company.id)
                      
                      if (error) {
                        console.error('Test update with just name error:', error)
                        alert(`Test update with just name failed: ${error.message}`)
                      } else {
                        console.log('Test update with just name successful')
                        alert('Test update with just name successful')
                      }
                    } catch (err) {
                      console.error('Test update with just name exception:', err)
                      alert(`Test update with just name exception: ${err}`)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/10 ml-2 text-xs"
                >
                  Test Just Name
                </Button>
                
                {/* Test update with no data */}
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (!company) return
                    
                    try {
                      console.log('Testing update with no data...')
                      const updateData = {}
                      
                      console.log('Update data (empty):', updateData)
                      
                      const { error } = await supabase
                        .from('companies')
                        .update(updateData)
                        .eq('id', company.id)
                      
                      if (error) {
                        console.error('Test update with no data error:', error)
                        alert(`Test update with no data failed: ${error.message}`)
                      } else {
                        console.log('Test update with no data successful')
                        alert('Test update with no data successful')
                      }
                    } catch (err) {
                      console.error('Test update with no data exception:', err)
                      alert(`Test update with no data exception: ${err}`)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/10 ml-2 text-xs"
                >
                  Test No Data
                </Button>
                
                {/* Test raw SQL update */}
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    if (!company) return
                    
                    try {
                      console.log('Testing raw SQL update...')
                      
                      const { error } = await supabase
                        .rpc('update_company_name_only', { 
                          company_id: company.id, 
                          new_name: company.name + ' (Raw SQL Test)' 
                        })
                      
                      if (error) {
                        console.error('Test raw SQL update error:', error)
                        alert(`Test raw SQL update failed: ${error.message}`)
                      } else {
                        console.log('Test raw SQL update successful')
                        alert('Test raw SQL update successful')
                      }
                    } catch (err) {
                      console.error('Test raw SQL update exception:', err)
                      alert(`Test raw SQL update exception: ${err}`)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/80 ml-2 text-xs"
                >
                  Test Raw SQL
                </Button>
                
                {/* Test Logging */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('=== TEST LOGGING ===')
                    console.log('Company data:', company)
                    console.log('Form data:', form)
                    console.log('=== END TEST LOGGING ===')
                    alert('Check console for test logging output')
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/80 ml-2 text-xs"
                >
                  Test Logging
                </Button>
                
                {/* Test Function Call */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('=== TESTING FUNCTION CALL ===')
                    try {
                      // Create a mock event
                      const mockEvent = { preventDefault: () => {} } as React.FormEvent
                      console.log('Mock event created:', mockEvent)
                      
                      // Call our function
                      console.log('About to call handleUpdateCompany...')
                      handleUpdateCompany(mockEvent)
                      console.log('handleUpdateCompany called successfully')
                    } catch (error) {
                      console.error('Error calling handleUpdateCompany:', error)
                    }
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/80 ml-2 text-xs"
                >
                  Test Function Call
                </Button>
                
                {/* Simple Test */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    alert('Simple test button works!')
                    console.log('Simple test button clicked')
                  }}
                  className="border-white/20 text-white/80 hover:bg-white/80 ml-2 text-xs"
                >
                  Simple Test
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
  )
}
