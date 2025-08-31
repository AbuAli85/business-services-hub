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
  created_at: string
  updated_at?: string
}

interface CompanyForm {
  name: string
  description: string
  cr_number: string
  vat_number: string
  address: string
  phone: string
  email: string
  website: string
  industry: string
  size: string
  founded_year: number
  logo_url: string
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

  // Helper function to safely render company data values
  const safeRenderValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value.toString()
    return String(value)
  }

  // Helper function to format company size labels
  const getCompanySizeLabel = (size: string) => {
    switch (size) {
      case 'small_business': return 'Small Business'
      case 'medium_business': return 'Medium Business'
      case 'large_business': return 'Large Business'
      case 'enterprise': return 'Enterprise'
      case 'startup': return 'Startup'
      case 'freelancer': return 'Freelancer'
      default: return size
    }
  }

  // Fetch company data
  const fetchCompanyData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
          setCompany(companyData)
          setForm({
            name: companyData.name || '',
            description: companyData.description || '',
            cr_number: companyData.cr_number || '',
            vat_number: companyData.vat_number || '',
            address: companyData.address || '',
            phone: companyData.phone || '',
            email: companyData.email || '',
            website: companyData.website || '',
            industry: companyData.industry || '',
            size: companyData.size || '',
            founded_year: companyData.founded_year || new Date().getFullYear(),
            logo_url: companyData.logo_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle logo file change
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload logo to storage
  const uploadLogoToStorage = async (): Promise<string | null> => {
    if (!logoFile) return null

    try {
      setUploadingLogo(true)
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `company-logos/${fileName}`

      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        toast.error('Failed to upload logo')
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      toast.error('Failed to upload logo')
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  // Create company
  const handleCreateCompany = async () => {
    try {
      setSubmitting(true)
      setError(null)
      
      if (!form.name.trim()) {
        setError('Company name is required')
        return
      }

      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let logoUrl = form.logo_url
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogoToStorage()
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl
        }
      }

      const companyData = {
        owner_id: user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        cr_number: form.cr_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        industry: form.industry.trim() || null,
        size: form.size.trim() || null,
        founded_year: form.founded_year || null,
        logo_url: logoUrl || null
      }

      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()

      if (error) {
        setError(`Failed to create company: ${error.message}`)
        return
      }

      // Update user profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: newCompany.id })
        .eq('id', user.id)

      if (profileError) {
        setError('Company created but failed to link to profile')
      } else {
        setSuccess('Company created successfully!')
      }

      setCompany(newCompany)
      setCreating(false)
      setEditing(false)
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error) {
      console.error('Error creating company:', error)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Update company
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
        description: form.description.trim() || null,
        cr_number: form.cr_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        industry: form.industry.trim() || null,
        size: form.size.trim() || null,
        founded_year: form.founded_year || null,
        logo_url: logoUrl || null
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

      setCompany(prev => prev ? { ...prev, ...updateData } : null)
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
      setForm({
        name: company.name || '',
        description: company.description || '',
        cr_number: company.cr_number || '',
        vat_number: company.vat_number || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        industry: company.industry || '',
        size: company.size || '',
        founded_year: company.founded_year || new Date().getFullYear(),
        logo_url: company.logo_url || ''
      })
    }
    setLogoFile(null)
    setLogoPreview(null)
    setCreating(false)
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  useEffect(() => {
    fetchCompanyData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
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
      </div>

      {!company && !creating ? (
        /* No Company State */
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
        /* Company Form */
        <div className="max-w-6xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
              <CardTitle className="text-2xl text-gray-900">
                {creating ? 'Launch Your Company' : 'Update Company Profile'}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                {creating 
                  ? 'Create a comprehensive company profile to establish your business presence'
                  : 'Update your company information and keep it current'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={creating ? handleCreateCompany : handleUpdateCompany}>
                {/* Company Logo Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
                  <div className="flex items-start space-x-6">
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
                    
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="logo_file" className="text-sm font-semibold text-gray-700">
                          Upload Logo File
                        </Label>
                        <input
                          id="logo_file"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG, SVG up to 5MB</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo_url" className="text-sm font-semibold text-gray-700">
                          Or Enter Logo URL
                        </Label>
                        <Input
                          id="logo_url"
                          value={form.logo_url}
                          onChange={(e) => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                          placeholder="https://example.com/logo.png"
                          disabled={!!logoFile}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Identity Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Identity</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                        Company Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your company name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-sm font-semibold text-gray-700">
                        Industry
                      </Label>
                      <select
                        id="industry"
                        value={form.industry}
                        onChange={(e) => setForm(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Industry</option>
                        <option value="Digital Marketing">Digital Marketing</option>
                        <option value="Legal Services">Legal Services</option>
                        <option value="Accounting">Accounting</option>
                        <option value="IT Services">IT Services</option>
                        <option value="Design & Branding">Design & Branding</option>
                        <option value="Consulting">Consulting</option>
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
                    />
                  </div>
                </div>

                {/* Business Details Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
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
                        className="w-full border border-gray-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
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
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
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
                      />
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
                      />
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
                      type="button"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!form.name.trim() || submitting || uploadingLogo}
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

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-800 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {error}
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
        /* Company Display */
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
                      />
                    ) : (
                      <Building2 className="h-12 w-12 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{company?.name || 'Company Name'}</h2>
                    {company?.description && (
                      <p className="text-blue-100 text-lg mb-4 max-w-2xl">{company.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {company?.industry && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {company.industry}
                        </Badge>
                      )}
                      {company?.size && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {getCompanySizeLabel(company.size)}
                        </Badge>
                      )}
                      {company?.founded_year && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          Est. {company.founded_year}
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
                      />
                    ) : (
                      <Upload className="h-12 w-12 text-gray-400" />
                    )}
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
                      {company?.cr_number || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">VAT Number</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {company?.vat_number || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Established</span>
                    <span className="text-sm text-gray-600">
                      {company?.founded_year || 'Not specified'}
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
                      {company?.address || 'Address not provided'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {company?.phone || 'Phone not provided'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {company?.email || 'Email not provided'}
                    </span>
                  </div>
                  {company?.website && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {company.website}
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
                    {company?.founded_year 
                      ? new Date().getFullYear() - company.founded_year 
                      : 'N/A'}
                  </div>
                  <p className="text-sm text-blue-700 font-medium">Years in Business</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {company?.size ? getCompanySizeLabel(company.size) : 'Not specified'}
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
