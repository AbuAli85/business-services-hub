/**
 * API Route: Automated Invoice Generation
 * 
 * POST /api/invoices/generate-automated
 * 
 * Automatically generates invoices from booking IDs with full data fetching.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInvoiceFromBooking, generateInvoicesForBookings } from '@/lib/workflows/generateInvoiceAutomated'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, bookingIds, options = {} } = body
    
    // Validate input
    if (!bookingId && (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either bookingId or bookingIds array is required' },
        { status: 400 }
      )
    }
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }
    
    // ==================== Single Invoice Generation ====================
    
    if (bookingId) {
      console.log('🚀 Generating invoice for single booking:', bookingId)
      
      const result = await generateInvoiceFromBooking(bookingId, {
        supabaseUrl,
        supabaseKey,
        ...options
      })
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Invoice generated successfully',
        invoice: result.invoice,
        pdf_url: result.pdfUrl
      })
    }
    
    // ==================== Bulk Invoice Generation ====================
    
    console.log(`🚀 Generating invoices for ${bookingIds.length} bookings`)
    
    const result = await generateInvoicesForBookings(bookingIds, {
      supabaseUrl,
      supabaseKey,
      ...options
    })
    
    return NextResponse.json({
      success: true,
      message: `Generated ${result.successful} invoices (${result.failed} failed)`,
      successful: result.successful,
      failed: result.failed,
      results: result.results
    })
    
  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint: Generate invoices for all approved bookings without invoices
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Finding approved bookings without invoices...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Find approved bookings
    const { data: approvedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status')
      .in('status', ['approved', 'completed'])
    
    if (bookingsError) {
      throw bookingsError
    }
    
    if (!approvedBookings || approvedBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No approved bookings found',
        generated: 0
      })
    }
    
    // Find existing invoices
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('booking_id')
    
    const existingBookingIds = new Set(existingInvoices?.map(inv => inv.booking_id) || [])
    
    // Filter bookings that need invoices
    const bookingsNeedingInvoices = approvedBookings
      .filter(b => !existingBookingIds.has(b.id))
      .map(b => b.id)
    
    console.log(`📊 Found ${bookingsNeedingInvoices.length} bookings needing invoices`)
    
    if (bookingsNeedingInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All approved bookings already have invoices',
        generated: 0
      })
    }
    
    // Generate invoices
    const result = await generateInvoicesForBookings(bookingsNeedingInvoices, {
      supabaseUrl,
      supabaseKey,
      autoSendEmail: true
    })
    
    return NextResponse.json({
      success: true,
      message: `Generated ${result.successful} invoices`,
      successful: result.successful,
      failed: result.failed,
      total: bookingsNeedingInvoices.length
    })
    
  } catch (error) {
    console.error('❌ GET endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

