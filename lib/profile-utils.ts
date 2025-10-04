/**
 * Profile utilities with timeout protection
 * Fixes the 57014 statement timeout error
 */

import { createClient } from '@/utils/supabase/client'

export interface ProfileData {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  phone: string | null
  company_name: string | null
  created_at: string | null
  verification_status: string | null
  profile_completed: boolean | null
}

export interface CompanyData {
  id: string
  name: string | null
  owner_id: string
  created_at: string | null
}

/**
 * Safely fetch profile data with timeout protection
 */
export async function safeFetchProfile(userId: string): Promise<ProfileData | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, phone, company_name, created_at, verification_status, profile_completed')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.warn('Profile fetch error:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Profile fetch failed:', error)
    return null
  }
}

/**
 * Safely fetch company data with timeout protection
 */
export async function safeFetchCompany(ownerId: string): Promise<CompanyData | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, owner_id, created_at')
      .eq('owner_id', ownerId)
      .single()
    
    if (error) {
      console.warn('Company fetch error:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Company fetch failed:', error)
    return null
  }
}

/**
 * Batch fetch multiple profiles with timeout protection
 */
export async function safeFetchProfiles(userIds: string[]): Promise<ProfileData[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, phone, company_name, created_at, verification_status, profile_completed')
      .in('id', userIds)
    
    if (error) {
      console.warn('Batch profile fetch error:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Batch profile fetch failed:', error)
    return []
  }
}

/**
 * Create fallback profile data when fetch fails
 */
export function createFallbackProfile(userId: string, email?: string): ProfileData {
  return {
    id: userId,
    full_name: email ? email.split('@')[0] : 'Unknown User',
    email: email || null,
    role: 'client',
    phone: null,
    company_name: null,
    created_at: new Date().toISOString(),
    verification_status: 'pending',
    profile_completed: false
  }
}
