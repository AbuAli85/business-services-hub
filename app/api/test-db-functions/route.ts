import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test if calculate_booking_progress function exists
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type')
      .in('routine_name', ['calculate_booking_progress', 'update_milestone_progress', 'update_task'])
      .eq('routine_schema', 'public')

    if (functionsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check functions',
        details: functionsError
      }, { status: 500 })
    }

    // Test calculate_booking_progress function if it exists
    let functionTest = null
    if (functions?.some(f => f.routine_name === 'calculate_booking_progress')) {
      try {
        // Find a test booking
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id')
          .limit(1)

        if (bookings && bookings.length > 0) {
          const { data: result, error: testError } = await supabase
            .rpc('calculate_booking_progress', {
              booking_id: bookings[0].id
            })

          functionTest = {
            success: !testError,
            result,
            error: testError?.message
          }
        }
      } catch (testError) {
        functionTest = {
          success: false,
          error: testError instanceof Error ? testError.message : 'Unknown error'
        }
      }
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
