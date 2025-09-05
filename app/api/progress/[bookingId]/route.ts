import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'
import { z } from 'zod'

// CORS headers for cross-domain access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schemas
const CreateMilestoneSchema = z.object({
  milestone_name: z.string().min(1).max(255),
  steps: z.array(z.object({
    name: z.string().min(1).max(255),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']),
    tag: z.string().max(50).optional()
  })).optional().default([]),
  week_number: z.number().int().min(1).max(52)
})

const UpdateMilestoneSchema = z.object({
  milestone_id: z.string().uuid(),
  milestone_name: z.string().min(1).max(255).optional(),
  steps: z.array(z.object({
    name: z.string().min(1).max(255),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']),
    tag: z.string().max(50).optional()
  })).optional(),
  week_number: z.number().int().min(1).max(52).optional()
})

const UpdateStepSchema = z.object({
  milestone_id: z.string().uuid(),
  step_index: z.number().int().min(0),
  step: z.object({
    name: z.string().min(1).max(255),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']),
    tag: z.string().max(50).optional()
  })
})

// Helper function to authenticate user
async function authenticateUser(request: NextRequest) {
  let user = null
  let authError = null
  
  try {
    const supabase = await getSupabaseAdminClient()
    
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (tokenUser && !tokenError) {
          user = tokenUser
          return { user, authError }
        } else {
          authError = tokenError
        }
      } catch (tokenAuthError) {
        authError = tokenAuthError
      }
    }
    
    // If no Authorization header, try to extract session from cookies
    const cookieHeader = request.headers.get('cookie')
    if (!user && cookieHeader) {
      try {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        const accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token']
        if (accessToken) {
          const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(accessToken)
          if (cookieUser && !cookieError) {
            user = cookieUser
            return { user, authError }
          } else {
            authError = cookieError
          }
        }
      } catch (cookieError) {
        authError = cookieError
      }
    }
    
    if (!user) {
      authError = new Error('Authentication required')
    }
    
  } catch (error) {
    authError = error
  }
  
  return { user, authError }
}

// Helper function to check if user has access to booking
async function checkBookingAccess(bookingId: string, userId: string) {
  const supabase = await getSupabaseAdminClient()
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, client_id, provider_id')
    .eq('id', bookingId)
    .single()
  
  if (error || !booking) {
    return { hasAccess: false, isProvider: false, error: 'Booking not found' }
  }
  
  const isClient = booking.client_id === userId
  const isProvider = booking.provider_id === userId
  const hasAccess = isClient || isProvider
  
  return { hasAccess, isProvider, isClient, booking }
}

// GET /api/progress/[bookingId] - Fetch all progress milestones for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      const response = NextResponse.json({ error: 'Authentication failed', details: authError?.message }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { bookingId } = params
    const { hasAccess, error: accessError } = await checkBookingAccess(bookingId, user.id)
    
    if (!hasAccess) {
      const response = NextResponse.json({ error: 'Access denied', details: accessError }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    
    const { data: milestones, error } = await supabase
      .from('booking_progress')
      .select('*')
      .eq('booking_id', bookingId)
      .order('week_number', { ascending: true })
    
    if (error) {
      const response = NextResponse.json({ error: 'Failed to fetch progress', details: error.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Calculate overall progress
    const overallProgress = milestones.length > 0 
      ? Math.round(milestones.reduce((sum, milestone) => sum + milestone.progress, 0) / milestones.length)
      : 0
    
    const response = NextResponse.json({ 
      milestones: milestones || [],
      overall_progress: overallProgress,
      total_milestones: milestones?.length || 0
    })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
    
  } catch (error) {
    console.error('Error fetching progress:', error)
    const response = NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

// POST /api/progress/[bookingId] - Create default milestones when booking is created
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      const response = NextResponse.json({ error: 'Authentication failed', details: authError?.message }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { bookingId } = params
    const { hasAccess, isProvider, error: accessError } = await checkBookingAccess(bookingId, user.id)
    
    if (!hasAccess) {
      const response = NextResponse.json({ error: 'Access denied', details: accessError }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    if (!isProvider) {
      const response = NextResponse.json({ error: 'Only providers can create milestones' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    
    // Check if milestones already exist
    const { data: existingMilestones } = await supabase
      .from('booking_progress')
      .select('id')
      .eq('booking_id', bookingId)
    
    if (existingMilestones && existingMilestones.length > 0) {
      const response = NextResponse.json({ error: 'Milestones already exist for this booking' }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Create default milestones using the database function
    const { error: createError } = await supabase.rpc('create_default_milestones', {
      booking_uuid: bookingId
    })
    
    if (createError) {
      // Fallback: create milestones manually
      const defaultMilestones = [
        {
          booking_id: bookingId,
          milestone_name: 'Week 1: Planning',
          steps: [
            { name: 'Brief Review', status: 'pending', tag: 'planning' },
            { name: 'Calendar Setup', status: 'pending', tag: 'planning' },
            { name: 'Strategy Review', status: 'pending', tag: 'planning' }
          ],
          progress: 0,
          week_number: 1
        },
        {
          booking_id: bookingId,
          milestone_name: 'Week 2: Content Creation',
          steps: [
            { name: 'Design Creation', status: 'pending', tag: 'content' },
            { name: 'Copywriting', status: 'pending', tag: 'content' },
            { name: 'Quality Assurance', status: 'pending', tag: 'content' }
          ],
          progress: 0,
          week_number: 2
        },
        {
          booking_id: bookingId,
          milestone_name: 'Week 3: Posting',
          steps: [
            { name: 'Scheduling', status: 'pending', tag: 'posting' },
            { name: 'Ad Campaigns', status: 'pending', tag: 'posting' },
            { name: 'Live Posts', status: 'pending', tag: 'posting' }
          ],
          progress: 0,
          week_number: 3
        },
        {
          booking_id: bookingId,
          milestone_name: 'Week 4: Reporting',
          steps: [
            { name: 'Performance Monitoring', status: 'pending', tag: 'reporting' },
            { name: 'Report Generation', status: 'pending', tag: 'reporting' },
            { name: 'Client Review', status: 'pending', tag: 'reporting' }
          ],
          progress: 0,
          week_number: 4
        }
      ]
      
      const { error: insertError } = await supabase
        .from('booking_progress')
        .insert(defaultMilestones)
      
      if (insertError) {
        const response = NextResponse.json({ error: 'Failed to create milestones', details: insertError.message }, { status: 500 })
        Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
        return response
      }
    }
    
    // Fetch the created milestones
    const { data: milestones, error: fetchError } = await supabase
      .from('booking_progress')
      .select('*')
      .eq('booking_id', bookingId)
      .order('week_number', { ascending: true })
    
    if (fetchError) {
      const response = NextResponse.json({ error: 'Failed to fetch created milestones', details: fetchError.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const response = NextResponse.json({ 
      success: true,
      milestones: milestones || [],
      message: 'Default milestones created successfully'
    })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
    
  } catch (error) {
    console.error('Error creating milestones:', error)
    const response = NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

// PUT /api/progress/[bookingId] - Update milestone step status and recalculate progress
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      const response = NextResponse.json({ error: 'Authentication failed', details: authError?.message }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { bookingId } = params
    const { hasAccess, isProvider, error: accessError } = await checkBookingAccess(bookingId, user.id)
    
    if (!hasAccess) {
      const response = NextResponse.json({ error: 'Access denied', details: accessError }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    if (!isProvider) {
      const response = NextResponse.json({ error: 'Only providers can update milestones' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const body = await request.json()
    const validationResult = UpdateStepSchema.safeParse(body)
    
    if (!validationResult.success) {
      const response = NextResponse.json({ error: 'Invalid request data', details: validationResult.error.errors }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { milestone_id, step_index, step } = validationResult.data
    const supabase = await getSupabaseAdminClient()
    
    // Get current milestone data
    const { data: milestone, error: fetchError } = await supabase
      .from('booking_progress')
      .select('steps')
      .eq('id', milestone_id)
      .eq('booking_id', bookingId)
      .single()
    
    if (fetchError || !milestone) {
      const response = NextResponse.json({ error: 'Milestone not found', details: fetchError?.message }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Update the specific step
    const steps = [...milestone.steps]
    if (step_index >= 0 && step_index < steps.length) {
      steps[step_index] = step
    } else {
      const response = NextResponse.json({ error: 'Invalid step index' }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Calculate new progress based on completed steps
    const completedSteps = steps.filter(s => s.status === 'completed').length
    const newProgress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0
    
    // Update the milestone
    const { error: updateError } = await supabase
      .from('booking_progress')
      .update({
        steps,
        progress: newProgress,
        updated_at: new Date().toISOString()
      })
      .eq('id', milestone_id)
    
    if (updateError) {
      const response = NextResponse.json({ error: 'Failed to update milestone', details: updateError.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Get updated milestone data
    const { data: updatedMilestone, error: fetchUpdatedError } = await supabase
      .from('booking_progress')
      .select('*')
      .eq('id', milestone_id)
      .single()
    
    if (fetchUpdatedError) {
      const response = NextResponse.json({ error: 'Failed to fetch updated milestone', details: fetchUpdatedError.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const response = NextResponse.json({ 
      success: true,
      milestone: updatedMilestone,
      message: 'Milestone updated successfully'
    })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
    
  } catch (error) {
    console.error('Error updating milestone:', error)
    const response = NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

// DELETE /api/progress/[bookingId] - Remove milestone if needed
export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      const response = NextResponse.json({ error: 'Authentication failed', details: authError?.message }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { bookingId } = params
    const { hasAccess, isProvider, error: accessError } = await checkBookingAccess(bookingId, user.id)
    
    if (!hasAccess) {
      const response = NextResponse.json({ error: 'Access denied', details: accessError }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    if (!isProvider) {
      const response = NextResponse.json({ error: 'Only providers can delete milestones' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestone_id')
    
    if (!milestoneId) {
      const response = NextResponse.json({ error: 'milestone_id parameter is required' }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    
    const { error } = await supabase
      .from('booking_progress')
      .delete()
      .eq('id', milestoneId)
      .eq('booking_id', bookingId)
    
    if (error) {
      const response = NextResponse.json({ error: 'Failed to delete milestone', details: error.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Milestone deleted successfully'
    })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
    
  } catch (error) {
    console.error('Error deleting milestone:', error)
    const response = NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}
