'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseClient } from '@/lib/supabase'
import { useAdminRealtime } from '@/hooks/useAdminRealtime'
import { RealtimeNotifications } from '@/components/dashboard/RealtimeNotifications'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Eye,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  MessageSquare,
  Radio,
  RefreshCw
} from 'lucide-react'

interface VerificationProfile {
  id: string
  full_name: string
  email: string
  role: string
  company_name?: string
  phone?: string
  location?: string
  website?: string
  bio?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  profile_completed: boolean
  admin_notes?: string
  created_at: string
  verified_at?: string
  verified_by?: string
}

export default function AdminVerificationsPage() {
  const [profiles, setProfiles] = useState<VerificationProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedProfile, setSelectedProfile] = useState<VerificationProfile | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)

  // Real-time subscription for verification updates
  const { status: realtimeStatus, lastUpdate } = useAdminRealtime({
    enableUsers: true,
    enableVerifications: true,
    enableServices: false,
    enableBookings: false,
    enableInvoices: false,
    enablePermissions: false,
    debounceMs: 1500,
    showToasts: true
  })

  useEffect(() => {
    fetchProfiles()
  }, [])
  
  // Auto-refresh when real-time updates occur
  useEffect(() => {
    if (lastUpdate) {
      setHasRecentUpdate(true)
      fetchProfiles()
      setTimeout(() => setHasRecentUpdate(false), 3000)
    }
  }, [lastUpdate])

  const fetchProfiles = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          email, 
          role, 
          company_name, 
          phone, 
          location, 
          website, 
          bio, 
          verification_status, 
          profile_completed, 
          admin_notes, 
          created_at, 
          verified_at, 
          verified_by
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles:', error)
        toast.error('Failed to load profiles')
        return
      }

      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('An error occurred while loading profiles')
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (profileId: string, status: 'approved' | 'rejected') => {
    setActionLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('User not found')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          admin_notes: adminNotes || null
        })
        .eq('id', profileId)

      if (error) {
        console.error('Error updating verification status:', error)
        toast.error('Failed to update verification status')
        return
      }

      toast.success(`Profile ${status} successfully`)
      setSelectedProfile(null)
      setAdminNotes('')
      await fetchProfiles()
    } catch (error) {
      console.error('Error updating verification status:', error)
      toast.error('An error occurred while updating verification status')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = (profile.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (profile.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (profile.company_name && profile.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || profile.verification_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className={`bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-8 text-white transition-all duration-300 ${hasRecentUpdate ? 'ring-4 ring-yellow-400' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">User Verifications</h1>
              {realtimeStatus.connected && (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-green-100 text-lg mb-4">
              Review and approve user account applications with real-time updates
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{profiles.length} Total Profiles</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{profiles.filter(p => p.verification_status === 'pending').length} Pending</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>{profiles.filter(p => p.verification_status === 'approved').length} Approved</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center text-xs opacity-75">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <RealtimeNotifications />
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={fetchProfiles}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {profile.role === 'provider' ? (
                      <Building2 className="h-5 w-5 text-blue-600" />
                    ) : (
                      <User className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                    <CardDescription className="capitalize">{profile.role}</CardDescription>
                  </div>
                </div>
                {getStatusIcon(profile.verification_status)}
              </div>
              <div className="flex justify-between items-center mt-2">
                {getStatusBadge(profile.verification_status)}
                <span className="text-sm text-gray-500">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{profile.email}</span>
                </div>
                {profile.company_name && (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{profile.company_name}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{profile.phone}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <p className="line-clamp-2">{profile.bio}</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProfile(profile)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review
                </Button>
                {profile.verification_status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleVerification(profile.id, 'approved')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleVerification(profile.id, 'rejected')}
                      disabled={actionLoading}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No profiles found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Review Profile</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProfile(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <p className="text-sm font-medium">{selectedProfile.full_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{selectedProfile.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm font-medium capitalize">{selectedProfile.role}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedProfile.verification_status)}</div>
                </div>
                {selectedProfile.company_name && (
                  <div>
                    <Label>Company</Label>
                    <p className="text-sm font-medium">{selectedProfile.company_name}</p>
                  </div>
                )}
                {selectedProfile.location && (
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm font-medium">{selectedProfile.location}</p>
                  </div>
                )}
                {selectedProfile.phone && (
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm font-medium">{selectedProfile.phone}</p>
                  </div>
                )}
                {selectedProfile.website && (
                  <div>
                    <Label>Website</Label>
                    <a 
                      href={selectedProfile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedProfile.website}
                    </a>
                  </div>
                )}
              </div>

              {selectedProfile.bio && (
                <div>
                  <Label>Bio</Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-1">
                    {selectedProfile.bio}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about this profile..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              {selectedProfile.verification_status === 'pending' && (
                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={() => handleVerification(selectedProfile.id, 'approved')}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleVerification(selectedProfile.id, 'rejected')}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
