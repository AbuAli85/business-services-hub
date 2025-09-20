import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const userId = '6867a364-e239-4de7-9e07-fc6b5682d92c' // Digital Morph's ID
    
    console.log('🔍 Testing profile for Digital Morph:', userId)
    
    // Check if profile exists
    const { data: existingProfile, error: checkErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (checkErr && checkErr.code === 'PGRST116') {
      console.log('❌ Profile does not exist')
      return NextResponse.json({ 
        exists: false, 
        error: 'Profile does not exist',
        userId 
      })
    } else if (checkErr) {
      console.log('❌ Error checking profile:', checkErr.message)
      return NextResponse.json({ 
        exists: false, 
        error: checkErr.message,
        userId 
      })
    } else {
      console.log('✅ Profile exists:', existingProfile)
      return NextResponse.json({ 
        exists: true, 
        profile: existingProfile,
        userId 
      })
    }
  } catch (e: any) {
    console.error('❌ Test profile error:', e)
    return NextResponse.json({ 
      error: e.message,
      userId: '6867a364-e239-4de7-9e07-fc6b5682d92c'
    }, { status: 500 })
  }
}
