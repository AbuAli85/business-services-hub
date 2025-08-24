import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseClient()
    
    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        provider:profiles!services_provider_id_fkey(
          full_name,
          company:companies!profiles_company_id_fkey(
            name,
            logo_url
          )
        )
      `)
      .eq('id', serviceId)
      .single()

    if (error) {
      console.error('Error fetching service:', error)
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
