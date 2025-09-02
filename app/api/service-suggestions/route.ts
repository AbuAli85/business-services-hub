import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for service suggestion creation
const CreateSuggestionSchema = z.object({
  client_id: z.string().uuid(),
  suggested_service_id: z.string().uuid(),
  original_booking_id: z.string().uuid().optional(),
  suggestion_reason: z.string().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  expires_at: z.string().datetime().optional()
})

// Validation schema for suggestion updates
const UpdateSuggestionSchema = z.object({
  status: z.enum(['viewed', 'accepted', 'declined']),
  response_notes: z.string().max(500).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = await getSupabaseClient()
    
    // Set the auth token for this request
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'provider') {
      return NextResponse.json({ error: 'Only providers can create service suggestions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateSuggestionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { client_id, suggested_service_id, original_booking_id, suggestion_reason, priority, expires_at } = validationResult.data

    // Validate that the suggested service exists and belongs to the provider
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, title, provider_id, approval_status')
      .eq('id', suggested_service_id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (service.provider_id !== user.id) {
      return NextResponse.json({ error: 'You can only suggest your own services' }, { status: 403 })
    }

    if (service.approval_status !== 'approved') {
      return NextResponse.json({ error: 'You can only suggest approved services' }, { status: 400 })
    }

    // Validate that the client exists
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.role !== 'client') {
      return NextResponse.json({ error: 'You can only suggest services to clients' }, { status: 400 })
    }

    // Validate original booking if provided
    if (original_booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, client_id, provider_id')
        .eq('id', original_booking_id)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json({ error: 'Original booking not found' }, { status: 404 })
      }

      if (booking.client_id !== client_id || booking.provider_id !== user.id) {
        return NextResponse.json({ error: 'Invalid booking reference' }, { status: 400 })
      }
    }

    // Create the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('service_suggestions')
      .insert({
        provider_id: user.id,
        client_id,
        suggested_service_id,
        original_booking_id,
        suggestion_reason,
        priority,
        expires_at: expires_at || null,
        status: 'pending'
      })
      .select(`
        *,
        suggested_service:services(id, title, description, base_price, currency),
        client:profiles!service_suggestions_client_id_fkey(id, full_name, email),
        provider:profiles!service_suggestions_provider_id_fkey(id, full_name, email)
      `)
      .single()

    if (suggestionError) {
      console.error('Suggestion creation error:', suggestionError)
      return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 })
    }

    // Create notification for client
    await supabase.from('notifications').insert({
      user_id: client_id,
      type: 'service_suggestion',
      title: 'New Service Suggestion',
      message: `${(profile as any).full_name || 'A provider'} suggested "${service.title}" for you`,
      metadata: { 
        suggestion_id: suggestion.id,
        service_id: suggested_service_id,
        provider_id: user.id
      },
      priority: priority === 'urgent' ? 'high' : 'medium'
    })

    return NextResponse.json({ 
      success: true,
      suggestion,
      message: 'Service suggestion created successfully'
    })

  } catch (error) {
    console.error('Service suggestion creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = await getSupabaseClient()
    
    // Set the auth token for this request
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'sent' or 'received'
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Enhanced query with proper joins and error handling
    let query = supabase
      .from('service_suggestions')
      .select(`
        *,
        suggested_service:services(id, title, description, base_price, currency, category),
        client:profiles!client_id(id, full_name, email, avatar_url),
        provider:profiles!provider_id(id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Get user profile to determine role  
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log('User making request:', { 
      id: user.id, 
      email: user.email, 
      role: profile.role, 
      full_name: profile.full_name 
    })
    console.log('Request params:', { type, status, limit })

    // Filter based on user role and type with improved logic
    if (profile.role === 'provider') {
      if (type === 'sent') {
        query = query.eq('provider_id', user.id)
      } else {
        // Providers can see suggestions they sent (default for providers)
        query = query.eq('provider_id', user.id)
      }
    } else if (profile.role === 'client') {
      if (type === 'received' || !type) {
        // Clients see suggestions made to them (default for clients)
        query = query.eq('client_id', user.id)
      } else if (type === 'sent') {
        // Clients don't send suggestions, return empty
        query = query.eq('client_id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      }
    } else if (profile.role === 'admin') {
      // Admins can see all suggestions
      console.log('Admin user - showing all suggestions')
      if (type === 'sent') {
        query = query.not('provider_id', 'is', null)
      } else if (type === 'received') {
        query = query.not('client_id', 'is', null)
      }
      // For admin with no type specified, show all suggestions (no additional filter)
    } else {
      // For unknown roles, try to show suggestions related to this user
      console.log('Unknown role, trying to find suggestions for user:', profile.role)
      query = query.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    console.log('Executing query for user:', user.id)
    const { data: suggestions, error } = await query

    if (error) {
      console.error('Error fetching suggestions:', error)
      console.error('Query details:', { type, status, limit, userRole: profile.role, userId: user.id })
      return NextResponse.json({ 
        error: 'Failed to fetch suggestions',
        details: error.message,
        debugInfo: {
          userRole: profile.role,
          queryType: type,
          status: status,
          userId: user.id
        }
      }, { status: 500 })
    }

    console.log(`Found ${suggestions?.length || 0} suggestions for user ${user.id} (${profile.role})`)
    if (suggestions && suggestions.length > 0) {
      console.log('Sample suggestion:', {
        id: suggestions[0].id,
        provider_id: suggestions[0].provider_id,
        client_id: suggestions[0].client_id,
        status: suggestions[0].status
      })
    }

    return NextResponse.json({ 
      suggestions: suggestions || [],
      count: suggestions?.length || 0,
      debugInfo: {
        userRole: profile.role,
        queryType: type,
        foundSuggestions: suggestions?.length || 0,
        userId: user.id
      }
    })

  } catch (error) {
    console.error('Service suggestions fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = await getSupabaseClient()
    
    // Set the auth token for this request
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const suggestionId = searchParams.get('id')

    if (!suggestionId) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = UpdateSuggestionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { status, response_notes } = validationResult.data

    // Get the suggestion to verify ownership
    const { data: suggestion, error: suggestionError } = await supabase
      .from('service_suggestions')
      .select('id, client_id, provider_id, status, viewed_at')
      .eq('id', suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permissions
    const canUpdate = profile.role === 'admin' || 
                     (profile.role === 'client' && suggestion.client_id === user.id) ||
                     (profile.role === 'provider' && suggestion.provider_id === user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Update the suggestion
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'viewed' && !suggestion.viewed_at) {
      updateData.viewed_at = new Date().toISOString()
    }

    if (status === 'accepted' || status === 'declined') {
      updateData.responded_at = new Date().toISOString()
    }

    if (response_notes) {
      updateData.response_notes = response_notes
    }

    const { data: updatedSuggestion, error: updateError } = await supabase
      .from('service_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select(`
        *,
        suggested_service:services(id, title, description, base_price, currency),
        client:profiles!service_suggestions_client_id_fkey(id, full_name, email),
        provider:profiles!service_suggestions_provider_id_fkey(id, full_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Suggestion update error:', updateError)
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 })
    }

    // Create notification for the other party
    const notificationUserId = profile.role === 'client' ? suggestion.provider_id : suggestion.client_id
    const notificationMessage = status === 'accepted' 
      ? 'Your service suggestion was accepted!'
      : status === 'declined'
      ? 'Your service suggestion was declined'
      : 'Your service suggestion was viewed'

    await supabase.from('notifications').insert({
      user_id: notificationUserId,
      type: 'suggestion_response',
      title: 'Suggestion Response',
      message: notificationMessage,
      metadata: { 
        suggestion_id: suggestionId,
        status,
        response_notes
      },
      priority: 'medium'
    })

    return NextResponse.json({ 
      success: true,
      suggestion: updatedSuggestion,
      message: 'Suggestion updated successfully'
    })

  } catch (error) {
    console.error('Service suggestion update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
