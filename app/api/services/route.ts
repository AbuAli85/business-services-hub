import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { withCors, ok, created, badRequest, unauthorized, forbidden, handleOptions } from '@/lib/api-helpers'

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

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

export async function GET(request: NextRequest) {
  try {
    // Create a public client for services (no authentication required)
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Raw services from DB:', services?.slice(0, 2)) // Log first 2 services
    }
    
    if (error) {
      console.error('Error fetching services:', error)
      return withCors(NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 }))
    }
    
    // Fetch provider information separately to avoid complex joins
    const enrichedServices = await Promise.all(
      (services || []).map(async (service) => {
        try {
          // First try to get provider from profiles table
          const { data: provider, error: providerError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, company_name, avatar_url')
            .eq('id', service.provider_id)
            .single()
          
          if (providerError || !provider) {
            // If no profile found, try to get from auth.users
            if (process.env.NODE_ENV !== 'production') {
              console.log(`No profile found for provider_id: ${service.provider_id}, error:`, providerError)
            }
            
            const { data: authUser } = await supabase.auth.admin.getUserById(service.provider_id)
            
            if (authUser?.user) {
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Found auth user for provider_id: ${service.provider_id}`, authUser.user.email)
              }
              return {
                ...service,
                provider: {
                  id: authUser.user.id,
                  full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'Service Provider',
                  email: authUser.user.email || '',
                  phone: authUser.user.user_metadata?.phone || '',
                  company_name: authUser.user.user_metadata?.company_name || '',
                  avatar_url: authUser.user.user_metadata?.avatar_url || ''
                }
              }
            }
          }
          
          return {
            ...service,
            provider: provider || { 
              id: service.provider_id || '', 
              full_name: 'Service Provider', 
              email: '', 
              phone: '', 
              company_name: '', 
              avatar_url: '' 
            }
          }
        } catch (error) {
          console.error('Error enriching service:', error)
          return {
            ...service,
            provider: { 
              id: service.provider_id || '', 
              full_name: 'Service Provider', 
              email: '', 
              phone: '', 
              company_name: '', 
              avatar_url: '' 
            }
          }
        }
      })
    )
    
    // Debug logging for enriched services
    if (process.env.NODE_ENV !== 'production') {
      console.log('Enriched services:', enrichedServices?.slice(0, 2)) // Log first 2 enriched services
    }
    
    // Get total count for pagination (respecting filters)
    let countQuery = supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    if (category) {
      countQuery = countQuery.eq('category', category)
    }
    if (provider_id) {
      countQuery = countQuery.eq('provider_id', provider_id)
    }
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { count: totalCount } = await countQuery
    
    return ok({
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
