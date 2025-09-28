import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test the function directly with a specific booking ID
    const testBookingId = 'c08ba7e3-3518-4e9f-8802-8193c558856d'
    
    console.log('🧪 Testing calculate_booking_progress function directly')
    console.log('   Booking ID:', testBookingId)
    
    const { data: result, error } = await supabase.rpc('calculate_booking_progress', {
      booking_id: testBookingId
    })
    
    if (error) {
      console.error('❌ Function call failed:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        bookingId: testBookingId
      }, { status: 500 })
    }
    
    console.log('✅ Function call successful:', result)
    
    return NextResponse.json({
      success: true,
      result,
      bookingId: testBookingId,
      message: 'Function executed successfully'
    })
    
  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
