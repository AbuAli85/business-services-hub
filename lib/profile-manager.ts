import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'provider' | 'client' | 'staff'
  phone?: string
  company_name?: string
  company_id?: string
  logo_url?: string
  profile_completed: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ProfileUpdateData {
  full_name?: string
  phone?: string
  company_name?: string
  logo_url?: string
  profile_completed?: boolean
  verification_status?: 'pending' | 'approved' | 'rejected'
}

export class ProfileManager {
  private static instance: ProfileManager
  private profileCache = new Map<string, { data: UserProfile | null; timestamp: number }>()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // Reduced to 2 minutes for better isolation
  private readonly MAX_CACHE_SIZE = 50 // Limit cache size to prevent memory issues

  static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager()
    }
    return ProfileManager.instance
  }

  /**
   * Clean up old cache entries to prevent memory leaks and data conflicts
   */
  private cleanupCache(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []
    
    // Remove expired entries
    for (const [userId, entry] of Array.from(this.profileCache.entries())) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        entriesToDelete.push(userId)
      }
    }
    
    // Remove old entries if cache is too large
    if (this.profileCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.profileCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const excessEntries = sortedEntries.slice(0, this.profileCache.size - this.MAX_CACHE_SIZE)
      excessEntries.forEach(([userId]) => entriesToDelete.push(userId))
    }
    
    entriesToDelete.forEach(userId => {
      this.profileCache.delete(userId)
      console.log('🧹 Cleaned up cache for user:', userId)
    })
  }

  /**
   * Get user profile with caching and fallback logic
   */
  async getUserProfile(userId: string, useCache = true): Promise<UserProfile | null> {
    console.log('🔍 Getting user profile for:', userId)
    
    // Clean up old cache entries to prevent conflicts
    this.cleanupCache()
    
    // Validate userId to prevent cache key conflicts
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ Invalid userId provided:', userId)
      return null
    }
    
    // Check cache first
    if (useCache) {
      const cached = this.profileCache.get(userId)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('✅ Using cached profile data for user:', userId)
        return cached.data
      }
    }

    try {
      const supabase = await getSupabaseClient()
      
      // Try to get profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('⚠️ Profile fetch error:', error)
        throw error
      }

      let finalProfile: UserProfile | null = null

      if (profile) {
        // Profile exists in database
        finalProfile = {
          id: profile.id,
          full_name: profile.full_name || 'User',
          email: profile.email || '',
          role: profile.role || 'client',
          phone: profile.phone,
          company_name: profile.company_name,
          company_id: profile.company_id,
          logo_url: profile.logo_url,
          profile_completed: profile.profile_completed || false,
          verification_status: profile.verification_status || 'pending',
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString()
        }
        console.log('✅ Profile found in database:', finalProfile)
      } else {
        // No profile in database, try to create from auth metadata
        console.log('⚠️ No profile in database, attempting to create from auth metadata')
        finalProfile = await this.createProfileFromAuth(userId)
      }

      // Cache the result with validation
      if (finalProfile && finalProfile.id === userId) {
        this.profileCache.set(userId, {
          data: finalProfile,
          timestamp: Date.now()
        })
        console.log('💾 Cached profile for user:', userId)
      } else {
        console.warn('⚠️ Profile data validation failed, not caching')
      }

      return finalProfile

    } catch (error) {
      console.error('❌ Profile fetch failed:', error)
      
      // Return fallback profile from auth metadata
      return this.getFallbackProfile(userId)
    }
  }

  /**
   * Create profile from auth metadata when no database profile exists
   */
  private async createProfileFromAuth(userId: string): Promise<UserProfile | null> {
    try {
      const admin = await getSupabaseAdminClient()
      const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId)
      
      if (authError || !authUser.user) {
        console.error('❌ Could not get auth user:', authError)
        return null
      }

      const user = authUser.user
      const metadata = user.user_metadata || {}
      
      const newProfile: UserProfile = {
        id: userId,
        full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: metadata.role || 'client',
        profile_completed: false,
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Try to insert the profile
      const { error: insertError } = await admin
        .from('profiles')
        .insert(newProfile)

      if (insertError) {
        console.warn('⚠️ Could not create profile from auth:', insertError)
        return newProfile // Return the profile object even if we can't save it
      }

      console.log('✅ Created profile from auth metadata:', newProfile)
      return newProfile

    } catch (error) {
      console.error('❌ Error creating profile from auth:', error)
      return null
    }
  }

  /**
   * Get fallback profile from auth metadata only
   */
  private async getFallbackProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || session.user.id !== userId) {
        return null
      }

      const user = session.user
      const metadata = user.user_metadata || {}

      return {
        id: userId,
        full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: metadata.role || 'client',
        profile_completed: false,
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Error getting fallback profile:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: ProfileUpdateData): Promise<UserProfile | null> {
    console.log('🔍 Updating profile for:', userId, updateData)
    
    try {
      const admin = await getSupabaseAdminClient()
      
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      }

      const { data: updatedProfile, error } = await admin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ Profile update error:', error)
        throw error
      }

      console.log('✅ Profile updated successfully:', updatedProfile)
      
      // Clear cache
      this.profileCache.delete(userId)
      
      return {
        id: updatedProfile.id,
        full_name: updatedProfile.full_name || 'User',
        email: updatedProfile.email || '',
        role: updatedProfile.role || 'client',
        phone: updatedProfile.phone,
        company_name: updatedProfile.company_name,
        company_id: updatedProfile.company_id,
        logo_url: updatedProfile.logo_url,
        profile_completed: updatedProfile.profile_completed || false,
        verification_status: updatedProfile.verification_status || 'pending',
        created_at: updatedProfile.created_at || new Date().toISOString(),
        updated_at: updatedProfile.updated_at || new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Profile update failed:', error)
      throw error
    }
  }

  /**
   * Clear profile cache for a user or all users
   */
  clearCache(userId?: string): void {
    if (userId) {
      const deleted = this.profileCache.delete(userId)
      console.log('🗑️ Cache cleared for user:', userId, deleted ? 'success' : 'not found')
    } else {
      const size = this.profileCache.size
      this.profileCache.clear()
      console.log('🗑️ All profile cache cleared, removed', size, 'entries')
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: Array<{ userId: string; timestamp: number; age: number }> } {
    const now = Date.now()
    const entries = Array.from(this.profileCache.entries()).map(([userId, data]) => ({
      userId,
      timestamp: data.timestamp,
      age: now - data.timestamp
    }))
    
    return {
      size: this.profileCache.size,
      entries
    }
  }

  /**
   * Get company information for a user
   */
  async getCompanyInfo(userId: string): Promise<{ name?: string; logo_url?: string } | null> {
    try {
      const profile = await this.getUserProfile(userId)
      if (!profile?.company_id) {
        return null
      }

      const supabase = await getSupabaseClient()
      const { data: company, error } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', profile.company_id)
        .maybeSingle()

      if (error) {
        console.warn('⚠️ Company fetch error:', error)
        return null
      }

      return company || null

    } catch (error) {
      console.error('❌ Error getting company info:', error)
      return null
    }
  }
}

// Export singleton instance
export const profileManager = ProfileManager.getInstance()
