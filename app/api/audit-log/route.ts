import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * API endpoint to create audit logs with server-side authentication
 * This bypasses client-side RLS issues by using server-side Supabase client
 */
export async function POST(request: NextRequest) {
  try {
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
    
    // Create audit log entry with server-side client
    const auditLog = {
      service_id: serviceId,
      event,
      actor_id: user.id,
      actor_name: profile.full_name,
      actor_email: profile.email,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
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

