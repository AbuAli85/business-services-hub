import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'

function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(trimmed)
}

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

    if (!isValidUuid(serviceId)) {
      return NextResponse.json(
        { error: 'Invalid service ID. UUID expected', details: { received: serviceId } },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseClient()

    // Fetch service with packages
    const { data: serviceRow, error } = await supabase
      .from('services')
      .select(`
        *,
        service_packages(
          id,
          name,
          description,
          price,
          features
        )
      `)
      .eq('id', serviceId)
      .single()

    if (error || !serviceRow) {
      console.error('Error fetching service:', error)
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Enrich with provider profile (use admin client to bypass RLS for public view)
    let provider: any = null
    try {
      const admin = await getSupabaseAdminClient()
      const { data: providerRow } = await admin
        .from('profiles')
        .select('id, full_name, email, phone, company_name, avatar_url')
        .eq('id', serviceRow.provider_id)
        .single()
      provider = providerRow || null
    } catch (e) {
      // Ignore enrichment errors; still return service
      provider = null
    }

    // Ensure all array fields are properly initialized
    const sanitizedService = {
      ...serviceRow,
      provider,
      requirements: Array.isArray(serviceRow.requirements) ? serviceRow.requirements : [],
      deliverables: Array.isArray(serviceRow.deliverables) ? serviceRow.deliverables : [],
      service_packages: Array.isArray(serviceRow.service_packages) ? serviceRow.service_packages.map((pkg: any) => ({
        ...pkg,
        features: Array.isArray(pkg.features) ? pkg.features : []
      })) : []
    }

    return NextResponse.json({ service: sanitizedService })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
