import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { AdminUser, BackendUser, UserAction } from '@/types/users'
import { mapBackendUserToAdminUser } from '@/lib/utils/user'

interface UseUsersOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  enableRealtime?: boolean
}

interface UseUsersReturn {
  users: AdminUser[]
  loading: boolean
  error: string | null
  isFetching: boolean
  refetch: (force?: boolean) => Promise<void>
  updateUser: (userId: string, updates: Partial<AdminUser>) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  inviteUser: (email: string, role: string) => Promise<void>
  bulkAction: (userIds: string[], action: string, value: string) => Promise<void>
}

export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000,
    enableRealtime = true
  } = options

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const logUserAction = useCallback((action: UserAction) => {
    logger.info('User action performed', action)
    // TODO: Send to audit log service
  }, [])

  const fetchUsers = useCallback(async (force = false) => {
    if (isFetching && !force) {
      logger.debug('Fetch already in progress, skipping...')
      return
    }
    
    setIsFetching(true)
    logger.debug(`Fetching users (force: ${force})...`)
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      logger.error('API request timeout')
      setError('Request timeout. Please try again.')
      setLoading(false)
      setIsFetching(false)
    }, 10000)
    
    try {
      logger.debug('Initializing Supabase client...')
      const supabase = await getSupabaseClient()
      logger.debug('Supabase client initialized successfully')
      
      // Try to get session with retry logic
      let session = null
      let sessionRetries = 0
      const maxSessionRetries = 3
      
      while (!session && sessionRetries < maxSessionRetries) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        session = sessionData.session
        
        if (!session && sessionRetries < maxSessionRetries - 1) {
          logger.debug(`No session found, retrying... (${sessionRetries + 1}/${maxSessionRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          sessionRetries++
        } else {
          break
        }
      }

      // If still no session, try to refresh the session
      if (!session) {
        logger.debug('Attempting to refresh session...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshData.session) {
          session = refreshData.session
          logger.debug('Session refreshed successfully')
        } else {
          logger.error('Session refresh failed:', refreshError)
        }
      }

      if (!session) {
        logger.error('No session found after retries and refresh')
        setError('Please sign in to access this page. Session not found.')
        setLoading(false)
        setIsFetching(false)
        return
      }

      logger.debug('Session found:', {
        userId: session.user?.id,
        email: session.user?.email,
        role: session.user?.user_metadata?.role
      })

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        logger.debug('Using access token for API call')
      } else {
        logger.warn('No access token available for API call - trying without auth')
        // Try to get token from cookies as fallback
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        if (cookies['sb-access-token']) {
          headers['Authorization'] = `Bearer ${cookies['sb-access-token']}`
          logger.debug('Using access token from cookies as fallback')
        }
      }

      const apiUrl = `/api/admin/users?t=${Date.now()}&r=${Math.random()}`
      logger.debug('Making API call to:', apiUrl)

      const res = await fetch(apiUrl, { 
        cache: 'no-store', 
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      logger.debug('API response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        logger.error('API Error:', { status: res.status, error: errorText })
        
        if (res.status === 401) {
          setError('Authentication failed. Please sign in again.')
          setLoading(false)
          setIsFetching(false)
          return
        } else if (res.status === 403) {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
          setIsFetching(false)
          return
        } else {
          setError(`API Error: ${res.status} - ${errorText}`)
          setLoading(false)
          setIsFetching(false)
          return
        }
      }

      const json = await res.json()
      logger.debug('API Response:', { userCount: json.users?.length || 0 })
      
      // Debug specific user status mapping
      const digitalMorphUser = json.users?.find((u: any) => u.full_name === 'Digital Morph')
      if (digitalMorphUser) {
        console.log('🔍 Digital Morph user data (RAW from API):', {
          raw: digitalMorphUser,
          status: digitalMorphUser.status,
          verification_status: digitalMorphUser.verification_status,
          role: digitalMorphUser.role
        })
        logger.debug('🔍 Digital Morph user data (RAW from API):', {
          raw: digitalMorphUser,
          status: digitalMorphUser.status,
          verification_status: digitalMorphUser.verification_status,
          role: digitalMorphUser.role
        })
      }
      
      const apiUsers: AdminUser[] = (json.users || []).map((u: BackendUser) => {
        const mapped = mapBackendUserToAdminUser(u)
        if (u.full_name === 'Digital Morph') {
          console.log('🔍 Digital Morph mapped (after mapping):', {
            original: u,
            mapped: mapped
          })
          logger.debug('🔍 Digital Morph mapped:', {
            original: u,
            mapped: mapped
          })
        }
        return mapped
      })
      
      setUsers(apiUsers)
      setError(null)
      setRetryCount(0) // Reset retry count on successful fetch
      
      logger.debug('Users updated after fetch:', {
        total: apiUsers.length,
        active: apiUsers.filter(u => u.status === 'active').length,
        pending: apiUsers.filter(u => u.status === 'pending').length
      })
    } catch (error) {
      logger.error('Error fetching users:', error)
      
      // Don't retry automatically to prevent infinite loops
      setError(error instanceof Error ? error.message : 'Failed to fetch users')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  const updateUser = useCallback(async (userId: string, updates: Partial<AdminUser>) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      
      const userToUpdate = users.find(u => u.id === userId)
      logger.debug('🔄 Updating user:', {
        userId,
        userName: userToUpdate?.full_name,
        currentStatus: userToUpdate?.status,
        updates
      })
      
      const res = await fetch('/api/admin/user-update', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ user_id: userId, ...updates }) 
      })
      const data = await res.json()
      
      console.log('🔄 Update response:', {
        status: res.status,
        data,
        ok: res.ok
      })
      logger.debug('🔄 Update response:', {
        status: res.status,
        data
      })
      
      if (!res.ok) throw new Error(data?.error || 'Update failed')
      
      // Log the action
      logUserAction({
        type: 'status_change',
        userId,
        oldValue: users.find(u => u.id === userId)?.status,
        newValue: updates.status,
        timestamp: new Date().toISOString(),
        actor: session?.user?.id || 'unknown'
      })
      
      // Force refresh to get updated data
      await fetchUsers(true)
      
      // Additional verification: Check if the update actually worked
      try {
        const supabase = await getSupabaseClient()
        const { data: directCheck, error: directError } = await supabase
          .from('profiles')
          .select('id, verification_status, role')
          .eq('id', userId)
          .single()
        
        if (directError) {
          console.error('❌ Direct check failed:', directError)
        } else {
          console.log('🔍 Direct database check:', directCheck)
        }
      } catch (e) {
        console.error('❌ Direct check error:', e)
      }
    } catch (err: any) {
      logger.error('Error updating user:', err)
      throw err
    }
  }, [users, logUserAction, fetchUsers])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await updateUser(userId, { status: 'deleted' })
      
      logUserAction({
        type: 'delete',
        userId,
        timestamp: new Date().toISOString(),
        actor: 'current-user' // TODO: Get actual user ID
      })
    } catch (err: any) {
      logger.error('Error deleting user:', err)
      throw err
    }
  }, [updateUser, logUserAction])

  const inviteUser = useCallback(async (email: string, role: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Invitation failed')
      }
      
      logUserAction({
        type: 'invite',
        newValue: role,
        timestamp: new Date().toISOString(),
        actor: session?.user?.id || 'unknown'
      })
      
      await refetch(false)
    } catch (err: any) {
      logger.error('Error inviting user:', err)
      throw err
    }
  }, [logUserAction])

  const bulkAction = useCallback(async (userIds: string[], action: string, value: string) => {
    try {
      const ops = userIds.map(id => updateUser(id, { [action]: value }))
      await Promise.all(ops)
      
      logUserAction({
        type: 'bulk_action',
        userIds,
        newValue: value,
        timestamp: new Date().toISOString(),
        actor: 'current-user' // TODO: Get actual user ID
      })
    } catch (err: any) {
      logger.error('Error performing bulk action:', err)
      throw err
    }
  }, [updateUser, logUserAction])

  const refetch = useCallback(async (force = false) => {
    await fetchUsers(force)
  }, []) // Remove fetchUsers dependency to prevent re-creation

  // Initial fetch
  useEffect(() => {
    fetchUsers(true)
  }, []) // Empty dependency array to run only once on mount

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const intervalId = setInterval(() => {
      fetchUsers(false)
    }, refreshInterval)
    
    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval]) // Remove fetchUsers from dependencies

  // Realtime updates
  useEffect(() => {
    if (!enableRealtime) return
    
    let channel: any
    let lastFetchTime = 0
    
    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        channel = supabase
          .channel('admin-users-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            const now = Date.now()
            if (now - lastFetchTime > 2000) {
              lastFetchTime = now
              fetchUsers(false)
            }
          })
          .subscribe()
      } catch (error) {
        logger.error('Error setting up realtime:', error)
      }
    }
    
    setupRealtime()
    
    return () => {
      try { 
        if (channel) channel.unsubscribe() 
      } catch (error) {
        logger.error('Error unsubscribing from realtime:', error)
      }
    }
  }, [enableRealtime]) // Remove fetchUsers from dependencies

  return {
    users,
    loading,
    error,
    isFetching,
    refetch,
    updateUser,
    deleteUser,
    inviteUser,
    bulkAction
  }
}

