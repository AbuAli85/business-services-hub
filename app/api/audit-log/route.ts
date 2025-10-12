import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

/**
 * API endpoint to create audit logs with server-side authentication
 * This bypasses client-side RLS issues by using service role key
 * 
 * Note: We use service role key for audit logs because:
 * - Audit logs are system/administrative logs, not user-facing data
 * - RLS causes authentication context issues in various client scenarios
 * - Server-side validation ensures only admins can write logs
 */
export async function POST(request: NextRequest) {
  try {
    // First, verify the user is authenticated using the regular client
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user profile to verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 403 }
      )
    }
    
    // Verify user is admin or manager
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Get audit log data from request
    const { serviceId, event, metadata } = await request.json()
    
    if (!serviceId || !event) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: serviceId, event' },
        { status: 400 }
      )
    }
    
    // Create audit log entry using service role client to bypass RLS
    const auditLog = {
      service_id: serviceId,
      event,
      actor_id: user.id,
      actor_name: profile.full_name,
      actor_email: profile.email,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }
    
    // Use service role client for the insert
    // This bypasses RLS which causes issues with audit log creation
    
    // Debug: Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set!')
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
      return NextResponse.json(
        { 
          success: false, 
          error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please add it to Vercel environment variables and redeploy.' 
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Service role key is available, creating client...')
    console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40))
    console.log('🔑 Service role key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))
    
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )
    
    console.log('✅ Service role client created successfully')
    console.log('📝 Attempting to insert audit log:', { serviceId, event })
    
    const { data, error } = await serviceRoleClient
      .from('service_audit_logs')
      .insert(auditLog)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating audit log:', error)
      console.error('📋 Audit log data:', auditLog)
      console.error('🔍 Error code:', error.code)
      console.error('🔍 Error details:', error.details)
      console.error('🔍 Error hint:', error.hint)
      
      // Check if it's an RLS issue
      if (error.code === '42501') {
        console.error('🚨 RLS PERMISSION DENIED - Service role key may be incorrect or RLS is still enabled')
        console.error('💡 Verify: 1) Service role key is correct, 2) RLS is disabled for service_audit_logs')
      }
      
      return NextResponse.json(
        { success: false, error: error.message, code: error.code, details: error.details },
        { status: 500 }
      )
    }
    
    console.log('✅ Audit log created via API:', data.id)
    
    return NextResponse.json({
      success: true,
      data
    })
    
  } catch (error) {
    console.error('Audit log API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

