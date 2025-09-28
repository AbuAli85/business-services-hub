import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test if calculate_booking_progress function exists by trying to call it
    let functions = []
    let functionsError = null
    
    // Try to call the function to see if it exists
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .limit(1)

      if (bookings && bookings.length > 0) {
        const { data: result, error: testError } = await supabase
          .rpc('calculate_booking_progress', {
            booking_id: bookings[0].id
          })

        if (!testError) {
          functions.push({
            routine_name: 'calculate_booking_progress',
            routine_type: 'FUNCTION',
            data_type: 'integer',
            exists: true,
            test_result: result
          })
        } else {
          functionsError = testError
        }
      }
    } catch (err) {
      functionsError = err
    }

    if (functionsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check functions',
        details: functionsError
      }, { status: 500 })
    }

    // Function test is already done above
    const functionTest = functions.length > 0 ? {
      success: true,
      result: functions[0].test_result,
      error: null
    } : {
      success: false,
      result: null,
      error: functionsError instanceof Error ? functionsError.message : 'No functions found'
    }

    return NextResponse.json({
      success: true,
      functions: functions || [],
      functionTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database function test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
