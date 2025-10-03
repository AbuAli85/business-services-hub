import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { authLogger } from '@/lib/auth-logger'
import { profileManager } from '@/lib/profile-manager'

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const admin = await getSupabaseAdminClient()
    
    // Get the session from the request headers
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      console.log('🔍 Token length:', token.length)
      
      // Verify the token and get user ID
      const { data: { user }, error: authError } = await admin.auth.getUser(token)
      
      console.log('🔍 Token auth result:', { user: user?.id, error: authError?.message })
      
      if (authError || !user) {
        console.log('❌ Token authentication failed:', authError)
        authLogger.logLoginSuccess({
          success: false,
          method: 'callback',
          error: 'Invalid token'
        })
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      
      userId = user.id
      
      // Continue with the authenticated user
      const body = await request.json()
      const { formData, role } = body

      if (!formData || !role) {
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
      }

      // Prepare profile update data using ProfileManager
      const updateData: any = {
        profile_completed: true
      }

      // Add basic info - only use existing columns
      if (formData.phone) updateData.phone = formData.phone

      // Add role-specific data - only use existing columns
      if (role === 'provider') {
        if (formData.companyName) updateData.company_name = formData.companyName
        // Note: services, experience, businessType, teamSize, businessRegistration, 
        // certifications, languages, availability, pricing, specializations, portfolio 
        // columns don't exist in the profiles table yet
      } else if (role === 'client') {
        // Note: preferredCategories, budgetRange, projectTimeline, communicationPreference
        // columns don't exist in the profiles table yet
      }

      // Note: bio, location, website, linkedin, timezone, workingHours, testimonials
      // columns don't exist in the profiles table yet

      // Use ProfileManager to update the profile
      const updatedProfile = await profileManager.updateProfile(userId, updateData)
      
      if (!updatedProfile) {
        console.error('ProfileManager failed to update profile')
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      authLogger.logLoginSuccess({
        success: true,
        method: 'callback',
        userId: userId
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Profile completed successfully',
        profileData: {
          profile_completed: true,
          verification_status: 'pending' // Will be reviewed by admin
        }
      })
    } else {
      console.log('❌ No authorization header provided')
      authLogger.logLoginSuccess({
        success: false,
        method: 'callback',
        error: 'No authorization header'
      })
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    
    if (!userId) {
      console.log('❌ No user ID available')
      authLogger.logLoginSuccess({
        success: false,
        method: 'callback',
        error: 'User ID not found'
      })
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // This code is now handled above with ProfileManager

    authLogger.logLoginSuccess({
      success: true,
      method: 'callback',
      userId: userId || undefined
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Profile completed successfully',
      profileData: {
        profile_completed: true,
        verification_status: 'pending' // Will be reviewed by admin
      }
    })

  } catch (error) {
    console.error('❌ Profile completion error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: userId || 'unknown'
    })
    authLogger.logLoginSuccess({
      success: false,
      method: 'callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
