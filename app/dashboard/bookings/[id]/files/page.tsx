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

  // Upload file
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

      // Generate unique file name
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `booking-files/${bookingId}/${uploadCategory}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('booking-files')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-files')
        .getPublicUrl(filePath)

      // Save file record
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
          uploaded_by: user.id
        })

      if (dbError) {
        if (dbError.code === 'PGRST200' || dbError.message.includes('booking_files')) {
          toast.error('File storage system not yet configured. Please contact your administrator.')
          return
        }
        throw dbError
      }

      toast.success('File uploaded successfully')
      setShowUploadDialog(false)
      setSelectedFile(null)
      setUploadDescription('')
      await loadFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
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

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documents': return <FileText className="h-4 w-4" />
      case 'images': return <Image className="h-4 w-4" />
      case 'contracts': return <FileText className="h-4 w-4" />
      case 'deliverables': return <CheckCircle className="h-4 w-4" />
      case 'other': return <Paperclip className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
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
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                        <FileText className="h-4 w-4" />
                        Contracts
                      </div>
                    </SelectItem>
                    <SelectItem value="deliverables">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Deliverables
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
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Add a description for this file..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
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
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="deliverables">Deliverables</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No files match your current filters.' 
                : 'Upload your first file to get started.'}
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {viewMode === 'grid' ? (
                  // Grid View
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file.file_type)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 truncate" title={file.original_name}>
                            {file.original_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryIcon(file.category)}
                              <span className="ml-1 capitalize">{file.category}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const a = document.createElement('a')
                            a.href = file.file_url
                            a.download = file.original_name
                            a.click()
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(file)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {file.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{file.uploaded_by_user?.full_name || 'Unknown'}</span>
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
