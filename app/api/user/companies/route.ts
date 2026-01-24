import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Create Supabase client with user token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing database configuration' },
        { status: 500 }
      )
    }
    
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } catch (clientError) {
      console.error('❌ Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { error: 'Database connection error', details: 'Failed to initialize database client' },
        { status: 500 }
      )
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.warn('⚠️ User companies auth error:', authError?.message || 'No user found')
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message || 'User not authenticated' },
        { status: 401 }
      )
    }

    // Fetch all companies owned by the authenticated user
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to fetch companies', details: companiesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      companies: companies || [],
      count: companies?.length || 0
    })

  } catch (error) {
    console.error('❌ Unexpected error in /api/user/companies:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
