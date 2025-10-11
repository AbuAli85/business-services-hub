import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { ok, notFound } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id
    
    if (!serviceId) {
      return notFound('Service ID is required')
    }
    
    console.log('📥 Service Detail API: GET request for service:', serviceId)
    
    // Try admin client first, fall back to regular client
    let supabase
    try {
      supabase = await getSupabaseAdminClient()
      console.log('✅ Service Detail API: Using admin client')
    } catch (adminError) {
      console.log('⚠️ Service Detail API: Admin client unavailable, using regular client')
      supabase = await createClient()
    }
    
    // Fetch service with all related data
    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        provider:profiles!services_provider_id_fkey(
          id,
          full_name,
          email,
          phone,
          company_name,
          avatar_url,
          bio
        ),
        service_packages(
          id,
          name,
          description,
          price,
          features,
          duration_days
        )
      `)
      .eq('id', serviceId)
      .single()
    
    if (error) {
      console.error('❌ Service Detail API: Error fetching service:', error)
      
      if (error.code === 'PGRST116') {
        return notFound('Service not found')
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch service', details: error.message },
        { status: 500 }
      )
    }
    
    if (!service) {
      return notFound('Service not found')
    }
    
    // Fetch booking count for this service
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', serviceId)
    
    // Fetch reviews for this service
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, client_id, profiles(full_name, avatar_url)')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Calculate average rating
    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0
    
    // Enrich service data
    const enrichedService = {
      ...service,
      bookings_count: bookingCount || 0,
      rating: avgRating,
      reviews: reviews || []
    }
    
    console.log('✅ Service Detail API: Returning service:', enrichedService.title)
    
    return ok({
      service: enrichedService
    })
    
  } catch (error: any) {
    console.error('❌ Service Detail API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
