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
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data, error } = await serviceRoleClient
      .from('service_audit_logs')
      .insert(auditLog)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating audit log:', error)
      return NextResponse.json(
        { success: false, error: error.message },
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

