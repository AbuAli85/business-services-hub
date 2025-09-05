import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { table } = await request.json()
    
    // Try to query the table to see if it exists
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    if (error) {
      // If table doesn't exist, we'll get a relation does not exist error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ exists: false }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ exists: true, data })
  } catch (error) {
    console.error('Error checking schema:', error)
    return NextResponse.json({ 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
