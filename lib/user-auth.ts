import { getSupabaseClient } from './supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'client' | 'provider' | 'admin' | 'staff' | 'manager'
  phone?: string
  company_name?: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  name: string
  display_name: string
  is_active: boolean
  assigned_at: string
}

export interface UserWithRoles {
  id: string
  email: string
  full_name: string
  phone?: string
  country?: string
  company_id?: string
  is_verified: boolean
  created_at: string
  updated_at: string
  roles: UserRole[]
}

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    role?: string
    phone?: string
    company_name?: string
  }
}

export interface UserAuthResult {
  isAuthenticated: boolean
  user: AuthUser | null
  profile: UserProfile | null
  role: string | null
  roles: UserRole[]
  error?: string
}

/**
 * Standardized user authentication and role detection
 * This function provides a consistent way to get user information across the app
 */
export async function getUserAuth(): Promise<UserAuthResult> {
  try {
    const supabase = await getSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        role: null,
        roles: [],
        error: userError?.message || 'No authenticated user'
      }
    }

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get user roles from new user_roles_v2 table
    const { data: userRoles, error: rolesError } = await supabase
      .rpc('get_user_roles_v2', { user_uuid: user.id })

    // Determine primary role with fallback hierarchy
    let role: string | null = null
    let roles: UserRole[] = []
    
    if (userRoles && userRoles.length > 0) {
      // Primary: Use role from user_roles table
      const activeRole = userRoles.find((r: any) => r.is_active)
      role = activeRole?.role_name || userRoles[0]?.role_name || 'client'
      roles = userRoles.map((r: any) => ({
        name: r.role_name,
        display_name: r.role_display_name,
        is_active: r.is_active,
        assigned_at: r.assigned_at
      }))
    } else if (profile?.role) {
      // Fallback: Use role from profile
      role = profile.role
      roles = [{
        name: profile.role,
        display_name: profile.role.charAt(0).toUpperCase() + profile.role.slice(1),
        is_active: true,
        assigned_at: profile.created_at
      }]
    } else if (user.user_metadata?.role) {
      // Fallback: Use role from auth metadata
      role = user.user_metadata.role
      roles = [{
        name: user.user_metadata.role,
        display_name: user.user_metadata.role.charAt(0).toUpperCase() + user.user_metadata.role.slice(1),
        is_active: true,
        assigned_at: user.created_at || new Date().toISOString()
      }]
    } else {
      // Default: Assume client
      role = 'client'
      roles = [{
        name: 'client',
        display_name: 'Client',
        is_active: true,
        assigned_at: profile?.created_at || new Date().toISOString()
      }]
    }

    // If profile doesn't exist but user is authenticated, create a basic profile
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating basic profile for user:', user.id)
      
      const basicProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: role as 'client' | 'provider' | 'admin' | 'staff',
        phone: user.user_metadata?.phone || '',
        company_name: user.user_metadata?.company_name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Try to create profile
      const { error: createError } = await supabase
        .from('profiles')
        .insert(basicProfile)

      if (createError) {
        console.error('Failed to create profile:', createError)
        // Return user without profile
        return {
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata
          },
          profile: null,
          role,
          roles: [],
          error: 'Profile creation failed'
        }
      }

        return {
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata
          },
          profile: basicProfile,
          role,
          roles
        }
    }

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata
        },
        profile: null,
        role,
        roles,
        error: 'Profile fetch failed'
      }
    }

    return {
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata
      },
      profile,
      role,
      roles
    }

  } catch (error) {
    console.error('Authentication error:', error)
      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        role: null,
        roles: [],
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      }
  }
}

/**
 * Get user role with fallback logic
 */
export async function getUserRole(): Promise<string | null> {
  const authResult = await getUserAuth()
  return authResult.role
}

/**
 * Check if user has specific role
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  const role = await getUserRole()
  return role === requiredRole
}

/**
 * Check if user has specific role using database function (more efficient)
 */
export async function hasRoleV2(requiredRole: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { data, error } = await supabase
      .rpc('has_role_v2', { user_uuid: user.id, role_name: requiredRole })
    
    if (error) {
      console.error('Error checking role:', error)
      return false
    }
    
    return data === true
  } catch (error) {
    console.error('Error in hasRoleV2:', error)
    return false
  }
}

/**
 * Get user profile with fallback to auth data
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const authResult = await getUserAuth()
  return authResult.profile
}
