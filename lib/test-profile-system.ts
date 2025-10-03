/**
 * Test script to verify profile system functionality
 * This can be run in browser console or as a utility function
 */

import { profileManager } from './profile-manager'

export async function testProfileSystem(userId: string) {
  console.log('🧪 Testing Profile System for user:', userId)
  
  try {
    // Test 1: Get user profile
    console.log('📋 Test 1: Getting user profile...')
    const profile = await profileManager.getUserProfile(userId)
    console.log('✅ Profile result:', profile)
    
    // Test 2: Get company info (if applicable)
    if (profile?.company_id) {
      console.log('🏢 Test 2: Getting company info...')
      const companyInfo = await profileManager.getCompanyInfo(userId)
      console.log('✅ Company info result:', companyInfo)
    }
    
    // Test 3: Update profile (if profile exists)
    if (profile) {
      console.log('✏️ Test 3: Updating profile...')
      const updateData = {
        updated_at: new Date().toISOString()
      }
      
      const updatedProfile = await profileManager.updateProfile(userId, updateData)
      console.log('✅ Profile update result:', updatedProfile)
    }
    
    // Test 4: Cache test
    console.log('⚡ Test 4: Testing cache...')
    const cachedProfile = await profileManager.getUserProfile(userId, true) // Use cache
    console.log('✅ Cached profile result:', cachedProfile)
    
    console.log('🎉 All profile system tests completed successfully!')
    
    return {
      success: true,
      profile,
      companyInfo: profile?.company_id ? await profileManager.getCompanyInfo(userId) : null
    }
    
  } catch (error) {
    console.error('❌ Profile system test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testProfileSystem = testProfileSystem
}
