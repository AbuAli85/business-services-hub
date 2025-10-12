import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple endpoint to test if environment variables are available
 * This helps diagnose configuration issues
 */
export async function GET(request: NextRequest) {
  const envVars = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    nodeEnv: process.env.NODE_ENV,
    allSupabaseVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  }
  
  console.log('🔍 Environment variables check:', envVars)
  
  return NextResponse.json({
    success: true,
    data: envVars
  })
}

