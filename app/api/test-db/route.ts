import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database test error:', testError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: testError.message,
        code: testError.code
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      testData: testData || [],
      environment: {
        supabaseUrl: supabaseUrl.substring(0, 20) + '...',
        supabaseServiceKey: supabaseServiceKey.substring(0, 10) + '...'
      }
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
