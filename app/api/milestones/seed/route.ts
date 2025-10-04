import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function GET() {
  console.log('🧪 Test GET endpoint called')
  return NextResponse.json({ message: 'Milestones seed API is working' }, { status: 200, headers: corsHeaders })
}

const SeedSchema = z.object({
  booking_id: z.string().uuid(),
  plan: z.string().optional().default('content_creation')
})

export async function POST(request: NextRequest) {
  console.log('🚀 MILESTONES SEED API ROUTE CALLED - START')
  try {
    console.log('🌱 Milestones seed API called')
    const supabase = await createClient()
    const body = await request.json()
    const { booking_id, plan } = SeedSchema.parse(body)

    console.log('📋 Request body:', { booking_id, plan })

    // Auth - simplified approach like other working API routes
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('🔐 Auth check result:', { user: user?.id, error: userError })
    
    if (userError || !user) {
      console.warn('❌ Authentication failed in milestones seed API:', userError)
      return NextResponse.json(
        { error: 'Unauthorized', details: userError?.message },
        { status: 401, headers: corsHeaders }
      )
    }

    // Booking + access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, provider_id, status')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.warn('Booking not found in milestones seed API:', bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    if (!isProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Only providers can seed milestones' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Prevent duplicate seeding if milestones already exist
    const { count: existingCount, error: countError } = await supabase
      .from('milestones')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking_id)

    if (countError) {
      console.warn('Error checking existing milestones:', countError)
      // If it's a permission error, continue anyway
      if (countError.code === '42501' || countError.message.includes('permission denied')) {
        console.warn('Permission denied for milestones table, continuing with seed operation')
      } else {
        return NextResponse.json(
          { error: 'Failed to check existing milestones', details: countError.message },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    if ((existingCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Milestones already exist for this booking' },
        { status: 409, headers: corsHeaders }
      )
    }

    // Define template
    type Template = { title: string; plusDays: number; estimated_hours: number; priority: 'low'|'normal'|'high'|'urgent'; order: number; tasks: { title: string; priority?: 'low'|'normal'|'high'|'urgent' }[] }
    const baseDate = new Date()
    const templates: Record<string, Template[]> = {
      content_creation: [
        {
          title: 'Research & Strategy',
          plusDays: 5,
          estimated_hours: 8,
          priority: 'normal',
          order: 0,
          tasks: [
            { title: 'Collect client requirements' },
            { title: 'Research audience & competitors' },
            { title: 'Draft content strategy outline' }
          ]
        },
        {
          title: 'Content Drafting',
          plusDays: 15,
          estimated_hours: 15,
          priority: 'high',
          order: 1,
          tasks: [
            { title: 'Blog drafts' },
            { title: 'Website copywriting' },
            { title: 'Social media posts' }
          ]
        },
        {
          title: 'Review & Feedback',
          plusDays: 19,
          estimated_hours: 6,
          priority: 'normal',
          order: 2,
          tasks: [
            { title: 'Submit drafts to client' },
            { title: 'Collect feedback' },
            { title: 'Apply revisions' }
          ]
        },
        {
          title: 'Final Delivery',
          plusDays: 22,
          estimated_hours: 4,
          priority: 'low',
          order: 3,
          tasks: [
            { title: 'Deliver final approved content package' },
            { title: 'Handover documents/files' },
            { title: 'Mark project as complete' }
          ]
        }
      ]
    }

    const planTemplates = templates[plan] || templates['content_creation']

    const created: any[] = []
    for (const tpl of planTemplates) {
      const due = new Date(baseDate)
      due.setDate(due.getDate() + tpl.plusDays)
      const toYmd = (d: Date) => d.toISOString().slice(0, 10)
      
      console.log('🔍 Milestone creation - Priority validation:', {
        templatePriority: tpl.priority,
        isValid: ['low', 'normal', 'high', 'urgent'].includes(tpl.priority)
      })
      
      const { data: milestone, error: mErr } = await supabase
        .from('milestones')
        .insert({
          booking_id,
          title: tpl.title,
          description: null,
          status: 'pending',
          priority: tpl.priority,
          due_date: toYmd(due),
          estimated_hours: tpl.estimated_hours,
          actual_hours: 0,
          progress_percentage: 0,
          order_index: tpl.order,
          editable: true,
          weight: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (mErr || !milestone) {
        console.warn('Error creating milestone:', mErr)
        // If it's a permission error, return a more specific error
        if (mErr?.code === '42501' || mErr?.message?.includes('permission denied')) {
          console.warn('Permission denied for milestones table during creation')
          return NextResponse.json(
            { error: 'Permission denied: Unable to create milestone. Please check your database permissions.' },
            { status: 403, headers: corsHeaders }
          )
        }
        return NextResponse.json(
          { error: 'Failed to create milestone', details: mErr?.message },
          { status: 500, headers: corsHeaders }
        )
      }

      const tasksToInsert = tpl.tasks.map(t => {
        // Ensure priority is always a valid value
        const validPriorities = ['low', 'normal', 'high', 'urgent'] as const
        const taskPriority = (t.priority && validPriorities.includes(t.priority as any)) 
          ? t.priority 
          : 'normal'
        
        console.log('🔍 Task creation - Priority validation:', {
          originalPriority: t.priority,
          normalizedPriority: taskPriority,
          isValid: validPriorities.includes(taskPriority as any)
        })
        
        return {
          milestone_id: milestone.id,
          title: t.title,
          description: '',
          status: 'pending',
          priority: taskPriority,
          progress_percentage: 0,
          estimated_hours: 0,
          actual_hours: 0,
          editable: true,
          created_by: user.id
        }
      })

      if (tasksToInsert.length > 0) {
        const { error: tErr } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
        if (tErr) {
          console.warn('Error creating tasks:', tErr)
          // If it's a permission error, return a more specific error
          if (tErr.code === '42501' || tErr.message.includes('permission denied')) {
            console.warn('Permission denied for tasks table during creation')
            return NextResponse.json(
              { error: 'Permission denied: Unable to create tasks. Please check your database permissions.' },
              { status: 403, headers: corsHeaders }
            )
          }
          return NextResponse.json(
            { error: 'Failed to create tasks', details: tErr.message },
            { status: 500, headers: corsHeaders }
          )
        }
      }

      created.push({ milestone_id: milestone.id })
    }

    return NextResponse.json(
      { success: true, created },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}


