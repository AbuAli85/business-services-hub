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
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No authentication token found' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role for full query capabilities
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', details: 'Missing database configuration' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      })
    } catch (clientError) {
      console.error('❌ Failed to create Supabase client:', clientError)
      return new Response(
        JSON.stringify({ error: 'Database connection error', details: 'Failed to initialize database client' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.warn('⚠️ Profile search auth error:', authError?.message || 'No user found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'User not authenticated' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const id = (url.searchParams.get('id') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()
    const role = (url.searchParams.get('role') || '').trim() // 'client' | 'provider' | ''
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || '10')))

    // If searching by ID, return that specific profile with company data
    if (id) {
      // First, fetch the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, company_name')
        .eq('id', id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found
          return new Response(
            JSON.stringify({ profiles: [] }), 
            { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        console.error('⚠️ Profile fetch error:', profileError)
        return new Response(
          JSON.stringify({ error: profileError.message, details: 'Failed to fetch profile' }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Now fetch company data where owner_id matches this profile
      // This works because the FK is: companies.owner_id → profiles.id
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, address, phone, email, website, logo_url, cr_number, vat_number, created_at, updated_at')
        .eq('owner_id', id)
        .maybeSingle()
      
      if (companyError && companyError.code !== 'PGRST116') {
        console.warn('⚠️ Company fetch error:', companyError)
      }

      // Build enriched profile with company data
      const enrichedProfile = {
        ...profileData,
        companies: companyData ? [companyData] : []
      }

      console.log('✅ Profile fetched with company:', {
        profileId: profileData.id,
        profileName: profileData.full_name,
        hasCompany: !!companyData,
        companyName: companyData?.name,
        companyAddress: companyData?.address,
        companyWebsite: companyData?.website,
        companyData: companyData
      })

      // Additional debugging for the specific client
      if (profileData.email === 'chairman@falconeyegroup.net' || profileData.full_name?.toLowerCase().includes('fahad')) {
        console.log('🔍 DEBUGGING Fahad alamri data:', {
          profileData,
          companyData,
          enrichedProfile
        })
      }

      return new Response(
        JSON.stringify({ profiles: [enrichedProfile] }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
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
    if (searchError) {
      console.error('⚠️ Profile search error:', searchError)
      return new Response(
        JSON.stringify({ error: searchError.message, details: 'Failed to search profiles' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ results: searchData || [] }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (e: any) {
    console.error('❌ Critical error in profiles search API:', e)
    // Ensure we always return JSON, never HTML
    return new Response(
      JSON.stringify({ 
        error: e?.message || 'Internal error',
        details: 'An unexpected error occurred while searching profiles'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}


