import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schemas
const CreateCommentSchema = z.object({
  milestone_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  comment_type: z.enum(['general', 'feedback', 'question', 'issue']).default('general'),
  parent_id: z.string().uuid().optional() // For replies
})

const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  comment_type: z.enum(['general', 'feedback', 'question', 'issue']).optional()
})

// GET /api/milestones/comments - Get comments for a milestone
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestone_id')

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'milestone_id is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get milestone and check access
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        id,
        booking_id,
        title
      `)
      .eq('id', milestoneId)
      .single()

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'

    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Get comments with user information
    const { data: comments, error: commentsError } = await supabase
      .from('milestone_comments')
      .select(`
        id,
        milestone_id,
        content,
        comment_type,
        parent_id,
        created_at,
        updated_at,
        created_by,
        user:created_by (
          id,
          email,
          user_metadata
        )
      `)
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { comments: comments || [] },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST /api/milestones/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validatedData = CreateCommentSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get milestone and check access
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        id,
        booking_id,
        title
      `)
      .eq('id', validatedData.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'

    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('milestone_comments')
      .insert({
        milestone_id: validatedData.milestone_id,
        content: validatedData.content,
        comment_type: validatedData.comment_type,
        parent_id: validatedData.parent_id,
        created_by: user.id
      })
      .select(`
        id,
        milestone_id,
        content,
        comment_type,
        parent_id,
        created_at,
        updated_at,
        created_by,
        user:created_by (
          id,
          email,
          user_metadata
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Broadcast realtime update
    try {
      await supabase.channel(`booking:${milestone.booking_id}`)
        .send({
          type: 'broadcast',
          event: 'comment_added',
          payload: {
            comment: comment,
            milestone_id: validatedData.milestone_id
          }
        })
    } catch (realtimeError) {
      console.error('Error broadcasting realtime update:', realtimeError)
    }

    return NextResponse.json(
      { comment },
      { status: 201, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PATCH /api/milestones/comments - Update a comment
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate input
    const validatedData = UpdateCommentSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get comment and check access
    const { data: comment, error: commentError } = await supabase
      .from('milestone_comments')
      .select(`
        id,
        milestone_id,
        created_by,
        milestone:milestone_id (
          booking_id
        )
      `)
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if user is the comment creator
    if (comment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('milestone_comments')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        id,
        milestone_id,
        content,
        comment_type,
        parent_id,
        created_at,
        updated_at,
        created_by,
        user:created_by (
          id,
          email,
          user_metadata
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Broadcast realtime update
    try {
      await supabase.channel(`booking:${comment.milestone?.[0]?.booking_id}`)
        .send({
          type: 'broadcast',
          event: 'comment_updated',
          payload: {
            comment: updatedComment,
            milestone_id: comment.milestone_id
          }
        })
    } catch (realtimeError) {
      console.error('Error broadcasting realtime update:', realtimeError)
    }

    return NextResponse.json(
      { comment: updatedComment },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/milestones/comments - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get comment and check access
    const { data: comment, error: commentError } = await supabase
      .from('milestone_comments')
      .select(`
        id,
        milestone_id,
        created_by,
        milestone:milestone_id (
          booking_id
        )
      `)
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if user is the comment creator or admin
    const isAdmin = user.user_metadata?.role === 'admin'
    if (comment.created_by !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('milestone_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Broadcast realtime update
    try {
      await supabase.channel(`booking:${comment.milestone?.[0]?.booking_id}`)
        .send({
          type: 'broadcast',
          event: 'comment_deleted',
          payload: {
            comment_id: commentId,
            milestone_id: comment.milestone_id
          }
        })
    } catch (realtimeError) {
      console.error('Error broadcasting realtime update:', realtimeError)
    }

    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
