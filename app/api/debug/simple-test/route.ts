import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Simple Test API - Starting')
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔍 Simple Test API - Supabase URL exists:', !!supabaseUrl)
    console.log('🔍 Simple Test API - Service key exists:', !!supabaseServiceKey)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Try a simple query
    const { data, error } = await supabase
      .from('invoices')
      .select('id, amount, status')
      .limit(1)
    
    if (error) {
      console.error('❌ Simple Test API - Database error:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }
    
    console.log('✅ Simple Test API - Success')
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      data: data
    })

  } catch (error) {
    console.error('❌ Simple Test API - Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
