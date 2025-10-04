import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { z } from 'zod'
import { withCors, ok, created, badRequest, unauthorized, forbidden, handleOptions } from '@/lib/api-helpers'

import { triggerServiceCreated } from '@/lib/notification-triggers-simple'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Validation schema for service creation
const CreateServiceSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  category: z.string().min(2).max(50),
  base_price: z.number().positive(),
  currency: z.enum(['OMR', 'USD', 'EUR']).default('OMR'),
  estimated_duration: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.string().optional()
})

// Validation schema for service updates
const UpdateServiceSchema = CreateServiceSchema.partial()

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

export async function GET(request: NextRequest) {
  try {
    // Prefer admin client; gracefully fall back to anon client if admin key is unavailable
    let isPublicMode = false
    let supabase
    try {
      supabase = await getSupabaseAdminClient()
    } catch (_) {
      isPublicMode = true
      supabase = await createClient()
    }
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const category = searchParams.get('category')
    const provider_id = searchParams.get('provider_id')
    const requestedStatus = searchParams.get('status') || 'active'
    const page = parseInt(searchParams.get('page') || '1')
    const limitRaw = parseInt(searchParams.get('limit') || '20')
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20), 100)
    const search = searchParams.get('search')
    
    // Minimal fields for fast dashboard render
    let query = supabase
      .from('services')
      .select(
        `id, title, description, category, status, base_price, currency, cover_image_url, featured, created_at, provider_id`
      )
      .eq('status', isPublicMode ? 'approved' : requestedStatus)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (provider_id) {
      query = query.eq('provider_id', provider_id)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
    }
    
    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    const { data: services, error } = await query

    if (error) {
      console.error('Error fetching services:', error)
      if ((error as any)?.message?.includes('AbortError') || (error as any)?.name === 'AbortError') {
        return ok({ services: [], pagination: { page, limit, total: 0, pages: 0 } })
      }
      if (isPublicMode) {
        return ok({ services: [], pagination: { page, limit, total: 0, pages: 0 } })
      }
      return withCors(NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 }))
    }

    return ok({
      services: services || [],
      pagination: {
        page,
        limit,
        total: services ? services.length : 0,
        pages: services ? (services.length > 0 ? page + (services.length === limit ? 1 : 0) : page) : page
      }
    })
    
  } catch (error) {
    console.error('Services API error:', error)
    return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized()
    }
    
    // Check if user is a provider
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'provider') {
      return forbidden('Only providers can create services')
    }
    
    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateServiceSchema.safeParse(body)
    if (!validationResult.success) {
      return badRequest('Invalid request data', validationResult.error.errors)
    }
    
    const serviceData = validationResult.data
    
    // Create service
    const { data: service, error: createError } = await supabase
      .from('services')
      .insert({
        ...serviceData,
        provider_id: user.id,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select('*')
      .single()
    
    if (createError) {
      console.error('Error creating service:', createError)
      return withCors(NextResponse.json({ error: 'Failed to create service' }, { status: 500 }))
    }
    
    // Send notification to provider about service creation
    try {
      await triggerServiceCreated(service.id, {
        title: serviceData.title,
        provider_id: user.id,
        provider_name: user.email || 'Service Provider'
      })
    } catch (notificationError) {
      console.warn('Failed to send service creation notification:', notificationError)
      // Non-blocking - don't fail the service creation if notifications fail
    }
    
    return created({ 
      success: true,
      service,
      message: 'Service created successfully'
    })
    
  } catch (error) {
    console.error('Service creation error:', error)
    return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized()
    }
    
    const body = await request.json()
    const { service_id, ...updateData } = body
    
    if (!service_id) {
      return badRequest('Service ID is required')
    }
    
    // Validate update data
    const validationResult = UpdateServiceSchema.safeParse(updateData)
    if (!validationResult.success) {
      return badRequest('Invalid update data', validationResult.error.errors)
    }
    
    // Check if user owns the service or is admin
    const { data: service } = await supabase
      .from('services')
      .select('provider_id')
      .eq('id', service_id)
      .single()
    
    if (!service) {
      return withCors(NextResponse.json({ error: 'Service not found' }, { status: 404 }))
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (service.provider_id !== user.id && profile?.role !== 'admin') {
      return forbidden()
    }
    
    // Update service
    const { data: updatedService, error: updateError } = await supabase
      .from('services')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', service_id)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error updating service:', updateError)
      return withCors(NextResponse.json({ error: 'Failed to update service' }, { status: 500 }))
    }
    
    return ok({ 
      success: true,
      service: updatedService,
      message: 'Service updated successfully'
    })
    
  } catch (error) {
    console.error('Service update error:', error)
    return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
