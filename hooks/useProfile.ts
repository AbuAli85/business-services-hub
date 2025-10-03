import { useState, useEffect, useCallback } from 'react'
import { profileManager, type UserProfile } from '@/lib/profile-manager'

interface UseProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  companyInfo: { name?: string; logo_url?: string } | null
}

export function useProfile(userId?: string): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ name?: string; logo_url?: string } | null>(null)

  const loadProfile = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const [profileData, companyData] = await Promise.all([
        profileManager.getUserProfile(id),
        profileManager.getCompanyInfo(id)
      ])
      
      setProfile(profileData)
      setCompanyInfo(companyData)
      
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) return
    profileManager.clearCache(userId)
    await loadProfile(userId)
  }, [userId, loadProfile])

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!userId || !profile) return
    
    try {
      setError(null)
      
      const updatedProfile = await profileManager.updateProfile(userId, data)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    }
  }, [userId, profile])

  useEffect(() => {
    if (userId) {
      loadProfile(userId)
    } else {
      setProfile(null)
      setCompanyInfo(null)
      setLoading(false)
      setError(null)
    }
  }, [userId, loadProfile])

  return {
    profile,
    loading,
    error,
    refresh,
    updateProfile,
    companyInfo
  }
}
