import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  console.log('🚀 GET /api/invoices/pdf-simple/[id] route called')
  console.log('📋 Params:', params)
  console.log('🔗 URL:', request.url)
  
  try {
    const invoiceId = params.id.replace('.pdf', '')
    console.log('🔍 Processing invoice ID:', invoiceId)
    
    // Simple test response
    return NextResponse.json({ 
      message: 'Simple PDF route is working',
      invoiceId,
      params,
      url: request.url,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Simple route error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
