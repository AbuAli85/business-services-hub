import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { authLogger } from '@/lib/auth-logger'

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    
    // Get the session from the request headers
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing')
    
    let userId: string | null = null
    
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

      // Add basic info
      if (formData.bio) profileData.bio = formData.bio
      if (formData.location) profileData.location = formData.location
      if (formData.website) profileData.website = formData.website
      if (formData.linkedin) profileData.linkedin = formData.linkedin
      if (formData.phone) profileData.phone = formData.phone

      // Add role-specific data
      if (role === 'provider') {
        if (formData.companyName) profileData.company_name = formData.companyName
        if (formData.services) profileData.services = formData.services
        if (formData.experience) profileData.experience = formData.experience
        if (formData.certifications) profileData.certifications = formData.certifications
        if (formData.languages) profileData.languages = formData.languages
        if (formData.availability) profileData.availability = formData.availability
        if (formData.pricing) profileData.pricing = formData.pricing
        if (formData.specializations) profileData.specializations = formData.specializations
        if (formData.portfolio) profileData.portfolio = formData.portfolio
      } else if (role === 'client') {
        if (formData.preferredCategories) profileData.preferred_categories = formData.preferredCategories
        if (formData.budgetRange) profileData.budget_range = formData.budgetRange
        if (formData.projectTimeline) profileData.project_timeline = formData.projectTimeline
        if (formData.communicationPreference) profileData.communication_preference = formData.communicationPreference
      }

      // Add advanced fields
      if (formData.timezone) profileData.timezone = formData.timezone
      if (formData.workingHours) profileData.working_hours = formData.workingHours
      if (formData.testimonials) profileData.testimonials = formData.testimonials

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

    // Add basic info
    if (formData.bio) profileData.bio = formData.bio
    if (formData.location) profileData.location = formData.location
    if (formData.website) profileData.website = formData.website
    if (formData.linkedin) profileData.linkedin = formData.linkedin
    if (formData.phone) profileData.phone = formData.phone

    // Add role-specific data
    if (role === 'provider') {
      if (formData.companyName) profileData.company_name = formData.companyName
      if (formData.services) profileData.services = formData.services
      if (formData.experience) profileData.experience = formData.experience
      if (formData.certifications) profileData.certifications = formData.certifications
      if (formData.languages) profileData.languages = formData.languages
      if (formData.availability) profileData.availability = formData.availability
      if (formData.pricing) profileData.pricing = formData.pricing
      if (formData.specializations) profileData.specializations = formData.specializations
      if (formData.portfolio) profileData.portfolio = formData.portfolio
    } else if (role === 'client') {
      if (formData.preferredCategories) profileData.preferred_categories = formData.preferredCategories
      if (formData.budgetRange) profileData.budget_range = formData.budgetRange
      if (formData.projectTimeline) profileData.project_timeline = formData.projectTimeline
      if (formData.communicationPreference) profileData.communication_preference = formData.communicationPreference
    }

    // Add advanced fields
    if (formData.timezone) profileData.timezone = formData.timezone
    if (formData.workingHours) profileData.working_hours = formData.workingHours
    if (formData.testimonials) profileData.testimonials = formData.testimonials

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
    console.error('Profile completion error:', error)
    authLogger.logLoginSuccess({
      success: false,
      method: 'callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
