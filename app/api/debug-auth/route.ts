import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/authz'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  console.log('🔍 DEBUG AUTH: Starting debug authentication test')
  
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  
  console.log('🔍 DEBUG AUTH: Headers check:', {
    hasAuthHeader: !!authHeader,
    authHeaderValue: authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
    allHeaders: Object.fromEntries(headersList.entries())
  })
  
  try {
    // Test the requireRole function
    console.log('🔍 DEBUG AUTH: Testing requireRole function')
    const gate = await requireRole(['client', 'provider', 'admin'])
    
    console.log('🔍 DEBUG AUTH: requireRole result:', {
      ok: gate.ok,
      status: gate.status,
      message: gate.message,
      hasUser: gate.ok ? !!gate.user : false,
      userId: gate.ok ? gate.user?.id : null,
      role: gate.ok ? gate.role : null
    })
    
    if (!gate.ok) {
      return NextResponse.json({
        error: 'Authentication failed',
        details: {
          status: gate.status,
          message: gate.message,
          hasAuthHeader: !!authHeader,
          authHeaderPreview: authHeader ? `${authHeader.substring(0, 20)}...` : 'none'
        }
      }, { status: gate.status })
    }
    
    // Test direct Supabase client
    console.log('🔍 DEBUG AUTH: Testing direct Supabase client')
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    console.log('🔍 DEBUG AUTH: Direct Supabase client result:', {
      hasUser: !!userData?.user,
      userId: userData?.user?.id,
      error: userError?.message
    })
    
    return NextResponse.json({
      success: true,
      authentication: {
        requireRoleResult: {
          ok: gate.ok,
          userId: gate.user?.id,
          role: gate.role
        },
        directSupabaseResult: {
          hasUser: !!userData?.user,
          userId: userData?.user?.id,
          error: userError?.message
        },
        headers: {
          hasAuthHeader: !!authHeader,
          authHeaderPreview: authHeader ? `${authHeader.substring(0, 20)}...` : 'none'
        }
      }
    })
    
  } catch (error) {
    console.error('❌ DEBUG AUTH: Error during authentication test:', error)
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
