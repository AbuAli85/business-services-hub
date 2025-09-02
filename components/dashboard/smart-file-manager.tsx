'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Upload,
  Download,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Folder,
  Search,
  Filter,
  Grid,
  List,
  MoreHorizontal,
  Eye,
  Edit,
  Share2,
  Trash2,
  Copy,
  Move,
  Star,
  Clock,
  User,
  Calendar,
  HardDrive,
  Cloud,
  Shield,
  CheckCircle,
  AlertCircle,
  Link,
  ExternalLink,
  Paperclip,
  Plus,
  X,
  RefreshCw,
  Settings,
  Info,
  Tag,
  FolderOpen,
  FileCheck,
  FileX,
  FilePlus,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  mime_type: string
  size: number
  path: string
  url?: string
  created_at: string
  updated_at: string
  uploaded_by: {
    id: string
    full_name: string
    avatar_url?: string
  }
  tags: string[]
  description?: string
  is_shared: boolean
  download_count: number
  version: number
  status: 'uploading' | 'processing' | 'ready' | 'error'
  permissions: {
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_share: boolean
  }
}

interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface SmartFileManagerProps {
  bookingId: string
  userRole: 'client' | 'provider'
  allowedTypes?: string[]
  maxFileSize?: number // in MB
  maxFiles?: number
}

export default function SmartFileManager({
  bookingId,
  userRole,
  allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 10,
  maxFiles = 20
}: SmartFileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [folderPath, setFolderPath] = useState('/')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [bookingId, folderPath])

  const loadFiles = async () => {
    try {
      setLoading(true)
      // Mock data for now - would integrate with Supabase Storage
      const mockFiles: FileItem[] = [
        {
          id: '1',
          name: 'Project Requirements.pdf',
          type: 'file',
          mime_type: 'application/pdf',
          size: 2048576, // 2MB
          path: '/project-requirements.pdf',
          url: '#',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          uploaded_by: {
            id: 'user1',
            full_name: 'John Client',
            avatar_url: undefined
          },
          tags: ['requirements', 'initial'],
          description: 'Initial project requirements and specifications',
          is_shared: true,
          download_count: 3,
          version: 1,
          status: 'ready',
          permissions: {
            can_view: true,
            can_edit: userRole === 'client',
            can_delete: userRole === 'client',
            can_share: true
          }
        },
        {
          id: '2',
          name: 'Design Mockups',
          type: 'folder',
          mime_type: 'folder',
          size: 0,
          path: '/design-mockups',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          uploaded_by: {
            id: 'user2',
            full_name: 'Sarah Provider',
            avatar_url: undefined
          },
          tags: ['design', 'mockups'],
          description: 'Initial design concepts and mockups',
          is_shared: true,
          download_count: 0,
          version: 1,
          status: 'ready',
          permissions: {
            can_view: true,
            can_edit: userRole === 'provider',
            can_delete: userRole === 'provider',
            can_share: true
          }
        },
        {
          id: '3',
          name: 'progress-screenshot.png',
          type: 'file',
          mime_type: 'image/png',
          size: 1024000, // 1MB
          path: '/progress-screenshot.png',
          url: '#',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          uploaded_by: {
            id: 'user2',
            full_name: 'Sarah Provider',
            avatar_url: undefined
          },
          tags: ['progress', 'screenshot'],
          description: 'Latest progress screenshot',
          is_shared: true,
          download_count: 1,
          version: 1,
          status: 'ready',
          permissions: {
            can_view: true,
            can_edit: userRole === 'provider',
            can_delete: userRole === 'provider',
            can_share: true
          }
        }
      ]
      setFiles(mockFiles)
    } catch (error) {
      console.error('Error loading files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (uploadFiles: File[]) => {
    if (uploadFiles.length === 0) return

    // Initialize upload progress
    const initialProgress: UploadProgress[] = uploadFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))
    setUploadProgress(initialProgress)

    // Process uploads
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]
      
      try {
        // Update status to uploading
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'uploading' } : item
        ))

        // Simulate upload progress
        for (let progress = 10; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadProgress(prev => prev.map((item, index) => 
            index === i ? { ...item, progress } : item
          ))
        }

        // Mark as completed
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'completed', progress: 100 } : item
        ))

        // Add to files list
        const newFile: FileItem = {
          id: `new-${Date.now()}-${i}`,
          name: file.name,
          type: 'file',
          mime_type: file.type,
          size: file.size,
          path: `/${file.name}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          uploaded_by: {
            id: 'current-user',
            full_name: 'Current User'
          },
          tags: [],
          is_shared: false,
          download_count: 0,
          version: 1,
          status: 'ready',
          permissions: {
            can_view: true,
            can_edit: true,
            can_delete: true,
            can_share: true
          }
        }

        setFiles(prev => [newFile, ...prev])
        
      } catch (error) {
        console.error('Upload error:', error)
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'error', error: 'Upload failed' } : item
        ))
      }
    }

    // Clear progress after delay
    setTimeout(() => {
      setUploadProgress([])
    }, 3000)
    
    toast.success(`${uploadFiles.length} file(s) uploaded successfully`)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFileUpload(droppedFiles)
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return <Folder className="h-8 w-8 text-blue-500" />
    
    const mimeType = (file.mime_type || '').toLowerCase()
    if (mimeType.startsWith('image/')) return <FileImage className="h-8 w-8 text-green-500" />
    if (mimeType.startsWith('video/')) return <FileVideo className="h-8 w-8 text-purple-500" />
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-8 w-8 text-orange-500" />
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    if (mimeType.includes('text/') || mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-600" />
    
    return <File className="h-8 w-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = (file.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    const matchesType = filterType === 'all' || 
      (filterType === 'images' && file.mime_type.startsWith('image/')) ||
      (filterType === 'documents' && (file.mime_type.includes('pdf') || file.mime_type.includes('document') || file.mime_type.includes('text'))) ||
      (filterType === 'folders' && file.type === 'folder')
    
    return matchesSearch && matchesType
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'size':
        return b.size - a.size
      case 'date':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  return (
    <div className="h-full flex flex-col bg-white">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Files</h2>
            <p className="text-gray-600">Manage and share project documents and resources</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="outline">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="folders">Folders</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border border-gray-200 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <h3 className="font-medium text-blue-900 mb-3">Uploading Files</h3>
          <div className="space-y-2">
            {uploadProgress.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-blue-800">{item.file.name}</span>
                    <span className="text-xs text-blue-600">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
                <div className="w-6 h-6">
                  {item.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {item.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {item.status === 'uploading' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-32"></div>
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click the upload button to get started
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => (
              <Card 
                key={file.id} 
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedFile(file)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">
                      {getFileIcon(file)}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1 truncate w-full">
                      {file.name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">
                      {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)}
                    </p>
                    <div className="flex items-center space-x-1 mb-2">
                      {file.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(parseISO(file.updated_at))} ago
                    </p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3 flex justify-center space-x-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <div 
                key={file.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedFile(file)}
              >
                <div className="flex items-center flex-1 space-x-3">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                    <p className="text-sm text-gray-500">
                      {file.uploaded_by.full_name} • {formatDistanceToNow(parseISO(file.updated_at))} ago
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-1">
                      {file.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500 w-16 text-right">
                      {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)}
                    </span>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Upload Files</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">Select files to upload to this project</p>
            </div>
            <div className="p-4 space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to select files or drag and drop</p>
                <p className="text-xs text-gray-500">
                  Max {maxFileSize}MB per file • {maxFiles} files max
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                className="hidden"
                aria-label="Upload files"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(Array.from(e.target.files))
                    setShowUploadModal(false)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(selectedFile)}
                  <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Size:</label>
                  <p>{selectedFile.type === 'folder' ? 'Folder' : formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Type:</label>
                  <p>{selectedFile.mime_type}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Created:</label>
                  <p>{format(parseISO(selectedFile.created_at), 'PPP')}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Downloads:</label>
                  <p>{selectedFile.download_count}</p>
                </div>
              </div>
              
              {selectedFile.description && (
                <div>
                  <label className="font-medium text-gray-700">Description:</label>
                  <p className="text-gray-600">{selectedFile.description}</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {selectedFile.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FolderPlus({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Folder className="h-4 w-4" />
    </div>
  )
}
