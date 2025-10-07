'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'

interface LogoUploadProps {
  currentLogoUrl?: string
  onLogoChange: (logoUrl: string) => void
  userId: string
  userRole: 'provider' | 'client'
  className?: string
}

export function LogoUpload({ 
  currentLogoUrl, 
  onLogoChange, 
  userId, 
  userRole,
  className = '' 
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setUploading(true)

    try {
      const supabase = await getSupabaseClient()
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      // RLS policy requires the first folder to be the auth.uid()
      const filePath = `${userId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Update database
      if (userRole === 'provider') {
        // Update company logo
        const { error: companyError } = await supabase
          .from('companies')
          .update({ logo_url: publicUrl })
          .eq('owner_id', userId)

        if (companyError) throw companyError
      } else {
        // Update profile logo for clients
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ logo_url: publicUrl })
          .eq('id', userId)

        if (profileError) throw profileError
      }

      onLogoChange(publicUrl)
      toast.success('Logo uploaded successfully!')
      
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo. Please try again.')
      setPreviewUrl(currentLogoUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      if (userRole === 'provider') {
        // Remove from company
        const { error: companyError } = await supabase
          .from('companies')
          .update({ logo_url: null })
          .eq('owner_id', userId)

        if (companyError) throw companyError
      } else {
        // Remove from profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ logo_url: null })
          .eq('id', userId)

        if (profileError) throw profileError
      }

      setPreviewUrl(null)
      onLogoChange('')
      toast.success('Logo removed successfully!')
      
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error('Failed to remove logo. Please try again.')
    }
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Company Logo</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your company logo to personalize your experience
            </p>
          </div>

          {/* Logo Preview */}
          <div className="flex justify-center">
            <div className="relative w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 shadow-sm">
              {previewUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={previewUrl}
                    alt="Company logo"
                    fill
                    className="object-contain rounded-lg"
                    sizes="160px"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0 shadow-lg z-10"
                    onClick={removeLogo}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No logo uploaded</p>
                  <p className="text-xs text-gray-400 mt-1">Click to upload your logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload logo file"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {previewUrl ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>Supported formats: JPG, PNG, SVG</p>
            <p>Max file size: 5MB</p>
            <p>Recommended size: 200x200px</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
