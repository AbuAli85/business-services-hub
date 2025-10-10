'use server'

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Get access token from cookies or Authorization header
    let token = req.cookies.get('sb-access-token')?.value
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (bearerToken && (!token || token !== bearerToken)) {
      token = bearerToken
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with service role for full query capabilities
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.warn('⚠️ Profile search auth error:', authError?.message || 'No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const id = (url.searchParams.get('id') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()
    const role = (url.searchParams.get('role') || '').trim() // 'client' | 'provider' | ''
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || '10')))

    // If searching by ID, return that specific profile with company data
    if (id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          email, 
          role, 
          phone, 
          company_name,
          companies:companies!profiles_id_fkey(
            id,
            name,
            address,
            phone,
            email,
            website,
            logo_url,
            created_at,
            updated_at
          )
        `)
        .eq('id', id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found
          return NextResponse.json({ profiles: [] })
        }
        console.error('⚠️ Profile fetch error:', profileError)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      // If the companies query failed, try to fetch company data separately if company_name exists
      let enrichedProfile = { ...profileData }
      if (profileData && (!profileData.companies || (Array.isArray(profileData.companies) && profileData.companies.length === 0))) {
        console.log('🔍 No company data from direct query, trying alternative approach')
        // Try to get company by matching the company_name
        if (profileData.company_name) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('id, name, address, phone, email, website, logo_url, created_at, updated_at')
            .eq('name', profileData.company_name)
            .limit(1)
            .single()
          
          if (companyData) {
            enrichedProfile.companies = [companyData]
          }
        }
      }

      return NextResponse.json({ profiles: enrichedProfile ? [enrichedProfile] : [] })
    }

    // Otherwise, search by query string
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role', { count: 'exact' })
      .order('full_name')
      .limit(limit)

    if (role === 'client' || role === 'provider') {
      query = query.eq('role', role)
    }

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: searchData, error: searchError } = await query
    if (searchError) return NextResponse.json({ error: searchError.message }, { status: 500 })

    return NextResponse.json({ results: searchData || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


