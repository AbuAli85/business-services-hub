import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'
import { z } from 'zod'

import { triggerServiceCreated } from '@/lib/notification-triggers-simple'
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const category = searchParams.get('category')
    const provider_id = searchParams.get('provider_id')
    const status = searchParams.get('status') || 'active'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    
    // Build query
    let query = supabase
      .from('services')
      .select(`
        *,
        service_packages(
          id,
          name,
          description,
          price,
          features
        ),
        _count:bookings(count)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (provider_id) {
      query = query.eq('provider_id', provider_id)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    const { data: services, error, count } = await query
    
    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
    
    // Fetch provider information separately to avoid complex joins
    const admin = getSupabaseAdminClient()

    const enrichedServices = await Promise.all(
      (services || []).map(async (service) => {
        try {
          const { data: provider } = await admin
            .from('profiles')
            .select('id, full_name, email, phone, company_name, avatar_url')
            .eq('id', service.provider_id)
            .single()
          
          return {
            ...service,
            provider: provider || { id: '', full_name: 'Unknown Provider', email: '', phone: '', company_name: '', avatar_url: '' }
          }
        } catch (error) {
          console.error('Error enriching service:', error)
          return {
            ...service,
            provider: { id: '', full_name: 'Unknown Provider', email: '', phone: '', company_name: '', avatar_url: '' }
          }
        }
      })
    )
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    
    return NextResponse.json({
      services: enrichedServices,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is a provider
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'provider') {
      return NextResponse.json({ error: 'Only providers can create services' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateServiceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
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
    
    return NextResponse.json({ 
      success: true,
      service,
      message: 'Service created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Service creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { service_id, ...updateData } = body
    
    if (!service_id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }
    
    // Validate update data
    const validationResult = UpdateServiceSchema.safeParse(updateData)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid update data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    // Check if user owns the service or is admin
    const { data: service } = await supabase
      .from('services')
      .select('provider_id')
      .eq('id', service_id)
      .single()
    
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (service.provider_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      service: updatedService,
      message: 'Service updated successfully'
    })
    
  } catch (error) {
    console.error('Service update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
