import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug endpoint called')
    
    const supabase = await getSupabaseClient()
    console.log('✅ Supabase client obtained')
    
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1)
    
    console.log('🔍 Database test result:', { data: testData, error: testError })
    
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔍 Auth test result:', { user: user?.id, error: authError })
    
    // Get request headers for debugging
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: !testError,
        error: testError?.message || null
      },
      authentication: {
        user_id: user?.id || null,
        error: authError?.message || null
      },
      request: {
        headers: headers,
        url: request.url,
        method: request.method
      }
    })
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
