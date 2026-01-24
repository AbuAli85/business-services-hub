import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    // Use server client: reads Supabase auth from cookies (chunked sb-*-auth-token)
    // or Authorization: Bearer. Same as /api/bookings/self, utils/supabase/server.
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message ?? 'User not authenticated' },
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
