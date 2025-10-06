'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Search, 
  Filter, 
  Grid, 
  List, 
  FolderOpen,
  FileText,
  Image,
  File,
  Paperclip,
  CheckCircle,
  Calendar,
  User,
  MoreHorizontal,
  Plus,
  ArrowLeft,
  Share2,
  Star,
  Archive,
  Copy,
  Edit3,
  AlertCircle,
  Info,
  BarChart3,
  PieChart
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

interface BookingFile {
  id: string
  booking_id: string
  file_name: string
  original_name: string
  file_size: number
  file_type: string
  file_url: string
  category: string
  description: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
  uploaded_by_user?: {
    id: string
    full_name: string
    avatar_url: string
    role: string
  }
}

interface FileStats {
  totalFiles: number
  totalSize: number
  byCategory: Record<string, number>
  byType: Record<string, number>
  recentUploads: number
}

export default function ProjectFilesPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  // State management
  const [files, setFiles] = useState<BookingFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<BookingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalSize: 0,
    byCategory: {},
    byType: {},
    recentUploads: 0
  })

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'category'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('documents')
  const [uploadDescription, setUploadDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setSelectedFile(droppedFile)
      setShowUploadDialog(true)
    }
  }

  // Load files
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('booking_files')
        .select(`
          *,
          uploaded_by_user:profiles!uploaded_by(id, full_name, avatar_url, role)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
      
      if (error) {
        if (error.code === 'PGRST200' || error.message.includes('booking_files')) {
          console.log('Booking files table not yet created')
          setFiles([])
          setStats({
            totalFiles: 0,
            totalSize: 0,
            byCategory: {},
            byType: {},
            recentUploads: 0
          })
          return
        }
        throw error
      }
      
      setFiles(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Calculate file statistics
  const calculateStats = (fileData: BookingFile[]) => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats: FileStats = {
      totalFiles: fileData.length,
      totalSize: fileData.reduce((sum, file) => sum + file.file_size, 0),
      byCategory: {},
      byType: {},
      recentUploads: fileData.filter(file => new Date(file.created_at) > oneWeekAgo).length
    }

    // Calculate by category
    fileData.forEach(file => {
      stats.byCategory[file.category] = (stats.byCategory[file.category] || 0) + 1
      
      const type = file.file_type.split('/')[0]
      stats.byType[type] = (stats.byType[type] || 0) + 1
    })

    setStats(stats)
  }

  // Filter and sort files
  useEffect(() => {
    let filtered = [...files]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => file.category === selectedCategory)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.original_name.localeCompare(b.original_name)
          break
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'size':
          comparison = a.file_size - b.file_size
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredFiles(filtered)
  }, [files, searchTerm, selectedCategory, sortBy, sortOrder])

  // Upload file with progress
  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed',
        'text/plain', 'text/csv'
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('File type not allowed. Please upload PDF, images, documents, or spreadsheets.')
        return
      }

      // Generate descriptive file name preserving original name
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${randomId}_${sanitizedName}`
      const filePath = `booking-files/${bookingId}/${uploadCategory}/${fileName}`

      toast.loading('Uploading file...', { id: 'upload-progress' })

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('booking-files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('Failed to upload file to storage')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-files')
        .getPublicUrl(filePath)

      // Save file record with metadata
      const { error: dbError } = await supabase
        .from('booking_files')
        .insert({
          booking_id: bookingId,
          file_name: fileName,
          original_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          file_url: publicUrl,
          category: uploadCategory,
          description: uploadDescription.trim() || null,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('DB error:', dbError)
        if (dbError.code === 'PGRST200' || dbError.message.includes('booking_files')) {
          toast.error('File storage system not yet configured. Please contact your administrator.', { id: 'upload-progress' })
          return
        }
        throw new Error('Failed to save file record')
      }

      toast.success(`File "${selectedFile.name}" uploaded successfully!`, { id: 'upload-progress' })
      setShowUploadDialog(false)
      setSelectedFile(null)
      setUploadDescription('')
      setUploadCategory('documents')
      await loadFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      const message = error instanceof Error ? error.message : 'Failed to upload file'
      toast.error(message, { id: 'upload-progress' })
    } finally {
      setUploading(false)
    }
  }

  // Delete file
  const handleDelete = async (file: BookingFile) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) return

    try {
      const supabase = await getSupabaseClient()
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('booking-files')
        .remove([`booking-files/${bookingId}/${file.file_name}`])
      
      if (storageError) console.warn('Storage delete error:', storageError)
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('booking_files')
        .delete()
        .eq('id', file.id)
      
      if (dbError) {
        if (dbError.code === 'PGRST200' || dbError.message.includes('booking_files')) {
          toast.success('File deleted successfully')
          await loadFiles()
          return
        }
        throw dbError
      }
      
      toast.success('File deleted successfully')
      await loadFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-600" />
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileText className="h-5 w-5 text-green-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  // Get category icon with colors
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documents': return <FileText className="h-4 w-4 text-gray-700" />
      case 'images': return <Image className="h-4 w-4 text-purple-600" />
      case 'contracts': return <FileText className="h-4 w-4 text-blue-600" />
      case 'deliverables': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'references': return <Star className="h-4 w-4 text-yellow-600" />
      case 'other': return <Paperclip className="h-4 w-4 text-gray-500" />
      default: return <File className="h-4 w-4 text-gray-500" />
    }
  }

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/dashboard/bookings/${bookingId}`)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Booking
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Files</h1>
            <p className="text-gray-600">Manage all project-related files and documents</p>
          </div>
        </div>
        
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Upload Project File</DialogTitle>
              <p className="text-sm text-gray-600">Add files related to this project booking</p>
            </DialogHeader>
            <div className="space-y-5">
              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : selectedFile 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(selectedFile.type)}
                      <div className="text-left flex-1">
                        <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-700 font-medium">✓ File ready to upload</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className={`h-12 w-12 mx-auto ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {isDragging ? 'Drop file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-gray-600">or</p>
                    </div>
                    <label className="inline-block">
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Paperclip className="h-4 w-4 mr-2" />
                          Browse Files
                        </span>
                      </Button>
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt,.csv"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported: PDF, Images, Documents, Spreadsheets, ZIP (Max 50MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">
                  File Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'documents', label: 'Project Documents', icon: FileText, desc: 'Requirements, specs, notes' },
                    { value: 'images', label: 'Design & Images', icon: Image, desc: 'Mockups, screenshots, photos' },
                    { value: 'contracts', label: 'Contracts & Legal', icon: FileText, desc: 'Agreements, terms, invoices' },
                    { value: 'deliverables', label: 'Deliverables', icon: CheckCircle, desc: 'Final outputs, completed work' },
                    { value: 'references', label: 'References', icon: Star, desc: 'Inspiration, examples' },
                    { value: 'other', label: 'Other Files', icon: Paperclip, desc: 'Miscellaneous items' },
                  ].map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setUploadCategory(cat.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          uploadCategory === cat.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`h-5 w-5 mt-0.5 ${uploadCategory === cat.value ? 'text-blue-600' : 'text-gray-600'}`} />
                          <div>
                            <p className={`text-sm font-medium ${uploadCategory === cat.value ? 'text-blue-900' : 'text-gray-900'}`}>
                              {cat.label}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">{cat.desc}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">
                  File Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Add context about this file: purpose, version, important notes..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Help team members understand what this file contains and when to use it
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-xs text-gray-600">
                  {selectedFile && (
                    <span>
                      <span className="font-medium">{formatFileSize(selectedFile.size)}</span> will be uploaded to{' '}
                      <span className="font-medium capitalize">{uploadCategory}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowUploadDialog(false)
                    setSelectedFile(null)
                    setUploadDescription('')
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Recent Uploads</p>
                <p className="text-2xl font-bold">{stats.recentUploads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      All Categories
                    </div>
                  </SelectItem>
                  <SelectItem value="documents">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </div>
                  </SelectItem>
                  <SelectItem value="images">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Images
                    </div>
                  </SelectItem>
                  <SelectItem value="contracts">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Contracts
                    </div>
                  </SelectItem>
                  <SelectItem value="deliverables">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Deliverables
                    </div>
                  </SelectItem>
                  <SelectItem value="references">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-600" />
                      References
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [sort, order] = value.split('-')
                setSortBy(sort as any)
                setSortOrder(order as any)
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="size-desc">Largest First</SelectItem>
                  <SelectItem value="size-asc">Smallest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* View Mode */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No files match your filters' : 'No files uploaded yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.' 
                  : 'Start uploading project files, documents, images, contracts, and deliverables. All files are securely stored and organized by category.'}
              </p>
              
              {!(searchTerm || selectedCategory !== 'all') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-2">You can upload:</p>
                      <ul className="space-y-1 text-blue-800">
                        <li>• Project documents and specifications</li>
                        <li>• Design files and images</li>
                        <li>• Contracts and agreements</li>
                        <li>• Final deliverables and outputs</li>
                        <li>• Max file size: 50MB</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => setShowUploadDialog(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Upload Your First File
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {viewMode === 'grid' ? (
                  // Professional Grid View
                  <div className="space-y-3">
                    {/* Preview/Icon Area */}
                    <div 
                      className="relative bg-gray-50 rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => window.open(file.file_url, '_blank')}
                    >
                      {file.file_type.startsWith('image/') ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={file.file_url} 
                            alt={file.original_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {getFileIcon(file.file_type)}
                          <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
                            {file.file_type.split('/')[1] || file.file_type.split('/')[0]}
                          </p>
                        </div>
                      )}
                      
                      {/* Quick Actions Overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 bg-white shadow-md">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>File Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              Open in New Tab
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const a = document.createElement('a')
                              a.href = file.file_url
                              a.download = file.original_name
                              a.click()
                            }}>
                              <Download className="h-4 w-4 mr-2" />
                              Download File
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(file.file_url)
                              toast.success('File URL copied to clipboard')
                            }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(file)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete File
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-white shadow-sm">
                          {getCategoryIcon(file.category)}
                          <span className="ml-1 capitalize">{file.category}</span>
                        </Badge>
                      </div>
                    </div>
                    
                    {/* File Info */}
                    <div className="space-y-2">
                      <div>
                        <p 
                          className="font-semibold text-sm text-gray-900 truncate" 
                          title={file.original_name}
                        >
                          {file.original_name}
                        </p>
                        {file.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {file.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <BarChart3 className="h-3 w-3" />
                          <span className="font-medium">{formatFileSize(file.file_size)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                      
                      {/* Uploader Info */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-blue-600">
                              {(file.uploaded_by_user?.full_name || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{file.uploaded_by_user?.full_name || 'Unknown'}</span>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {file.uploaded_by_user?.role || 'user'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {file.original_name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {file.category}
                        </Badge>
                      </div>
                      {file.description && (
                        <p className="text-xs text-gray-600 truncate">
                          {file.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        <span>{file.uploaded_by_user?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.open(file.file_url, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        const a = document.createElement('a')
                        a.href = file.file_url
                        a.download = file.original_name
                        a.click()
                      }}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(file)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
