import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { authLogger } from '@/lib/auth-logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      authLogger.logLoginSuccess({
        success: false,
        method: 'callback',
        error: 'User not authenticated'
      })
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

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
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    authLogger.logLoginSuccess({
      success: true,
      method: 'callback',
      userId: user.id
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
