import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { authLogger } from '@/lib/auth-logger'

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const admin = getSupabaseAdminClient()
    
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

      // Prepare profile data based on role
      const profileData: any = {
        profile_completed: true,
        updated_at: new Date().toISOString()
      }

      // Add basic info - only use existing columns
      if (formData.phone) profileData.phone = formData.phone

      // Add role-specific data - only use existing columns
      if (role === 'provider') {
        if (formData.companyName) profileData.company_name = formData.companyName
        // Note: services, experience, businessType, teamSize, businessRegistration, 
        // certifications, languages, availability, pricing, specializations, portfolio 
        // columns don't exist in the profiles table yet
      } else if (role === 'client') {
        // Note: preferredCategories, budgetRange, projectTimeline, communicationPreference
        // columns don't exist in the profiles table yet
      }

      // Note: bio, location, website, linkedin, timezone, workingHours, testimonials
      // columns don't exist in the profiles table yet

      // Update the profile
      const { error: updateError } = await admin
        .from('profiles')
        .update(profileData)
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
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

    // Process the request with the authenticated user
    const body = await request.json()
    const { formData, role } = body

    if (!formData || !role) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // Prepare profile data based on role
    const profileData: any = {
      profile_completed: true,
      updated_at: new Date().toISOString()
    }

    // Add basic info - only use existing columns
    if (formData.phone) profileData.phone = formData.phone

    // Add role-specific data - only use existing columns
    if (role === 'provider') {
      if (formData.companyName) profileData.company_name = formData.companyName
      // Note: services, experience, businessType, teamSize, businessRegistration, 
      // certifications, languages, availability, pricing, specializations, portfolio 
      // columns don't exist in the profiles table yet
    } else if (role === 'client') {
      // Note: preferredCategories, budgetRange, projectTimeline, communicationPreference
      // columns don't exist in the profiles table yet
    }

    // Note: bio, location, website, linkedin, timezone, workingHours, testimonials
    // columns don't exist in the profiles table yet

    // Log the profile data being updated
    console.log('🔍 Updating profile with data:', {
      userId,
      role,
      profileDataKeys: Object.keys(profileData),
      profileDataSample: {
        profile_completed: profileData.profile_completed,
        phone: profileData.phone,
        company_name: profileData.company_name
      }
    })

    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await admin
      .from('profiles')
      .select('id, profile_completed')
      .eq('id', userId)
      .single()

    console.log('🔍 Profile check result:', {
      exists: !!existingProfile,
      checkError: checkError?.message,
      userId
    })

    if (checkError?.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('🔍 Profile does not exist, creating new profile...')
      
      if (!userId) {
        console.error('❌ No user ID available for profile creation')
        return NextResponse.json({ 
          error: 'No user ID available', 
          details: 'User ID is required to create profile' 
        }, { status: 400 })
      }
      
      const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId!)
      if (authError) {
        console.error('❌ Could not get auth user:', authError)
        return NextResponse.json({ 
          error: 'Could not retrieve user information', 
          details: authError?.message || 'Unknown auth error' 
        }, { status: 500 })
      }

      // Create new profile
      const { error: createError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          full_name: authUser.user?.user_metadata?.full_name || authUser.user?.email?.split('@')[0] || 'User',
          email: authUser.user?.email || null,
          role: role || 'provider',
          ...profileData,
          created_at: new Date().toISOString()
        })

      if (createError) {
        console.error('❌ Error creating profile:', createError)
        return NextResponse.json({ 
          error: 'Failed to create profile', 
          details: createError?.message || 'Unknown create error' 
        }, { status: 500 })
      }

      console.log('✅ Profile created successfully for user:', userId)
    } else if (checkError) {
      console.error('❌ Error checking profile:', checkError)
      return NextResponse.json({ 
        error: 'Failed to check profile', 
        details: checkError?.message || 'Unknown check error' 
      }, { status: 500 })
    } else {
      // Profile exists, update it
      console.log('🔍 Profile exists, updating...')
      
      const { error: updateError } = await admin
        .from('profiles')
        .update(profileData)
        .eq('id', userId)

      if (updateError) {
        console.error('❌ Error updating profile:', {
          error: updateError,
          userId,
          profileDataKeys: Object.keys(profileData),
          role
        })
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: updateError?.message || 'Unknown database error'
        }, { status: 500 })
      }

      console.log('✅ Profile updated successfully for user:', userId)
    }

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
