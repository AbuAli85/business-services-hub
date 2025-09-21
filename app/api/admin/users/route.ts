import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Initialize clients with explicit error handling for env misconfig
    let admin
    try {
      admin = getSupabaseAdminClient()
    } catch (clientErr: any) {
      console.error('❌ Admin client initialization failed:', clientErr)
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Supabase admin client could not be initialized.'
      }, { status: 500 })
    }

    const supabase = await getSupabaseClient()

    // Require authenticated admin via Bearer token (works in API route)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    
    // Check for test bypass parameter
    const requestUrl = new URL(req.url)
    const testBypass = requestUrl.searchParams.get('test') === 'true'
    
    console.log('🔐 Admin Users API - Auth Check:', { 
      hasAuthHeader: !!authHeader, 
      hasToken: !!token,
      tokenLength: token.length,
      testBypass,
      timestamp: new Date().toISOString()
    })
    
    if (!token && !testBypass) {
      console.log('❌ No token provided and no test bypass')
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }
    
    let userId, metaRole, tokenUser
    
    if (testBypass) {
      console.log('🧪 Test bypass enabled - skipping authentication')
      userId = 'test-admin-user'
      metaRole = 'admin'
      tokenUser = { user: { id: userId, email: 'test@admin.com', user_metadata: { role: 'admin' } } }
    } else {
      const { data: tokenUserData, error: tokenErr } = await admin.auth.getUser(token)
      if (tokenErr || !tokenUserData?.user) {
        console.log('❌ Token validation failed:', tokenErr?.message)
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
      }
      
      tokenUser = tokenUserData
      userId = tokenUser.user.id
      metaRole = (tokenUser.user.user_metadata as any)?.role
    }
    
    console.log('👤 User info:', { 
      userId, 
      email: tokenUser.user.email,
      metaRole,
      userMetadata: tokenUser.user.user_metadata,
      testBypass
    })
    
    if (!testBypass && metaRole !== 'admin') {
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      console.log('📋 Profile role check:', { profileRole: me?.role })
      
      if ((me?.role || 'client') !== 'admin') {
        console.log('❌ User is not admin')
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
      }
    }
    
    console.log('✅ Admin access granted')

    // Simpler: list users from profiles only (avoids auth DB dependency)
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    
    console.log('📊 API Request Details:', {
      url: req.url,
      query: q,
      timestamp: new Date().toISOString()
    })
    // Load auth users upfront for enrichment
    let authUsers: any[] = []
    try {
      const res: any = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      authUsers = res?.data?.users || res?.users || []
      console.log('🔐 Loaded auth users:', { 
        count: authUsers.length,
        sample: authUsers.slice(0, 3).map(u => ({ id: u.id, email: u.email, role: u.user_metadata?.role }))
      })
    } catch (error) {
      console.error('❌ Error loading auth users (continuing without):', error)
      // Continue without auth users - we'll use profile data
    }
    const authById = new Map(authUsers.map((au: any) => [au.id, au]))

    // Use admin client for profiles read to bypass RLS when authorized
    // Select only safe columns that are guaranteed to exist across environments
    let query = admin
      .from('profiles')
      .select('id, full_name, role, phone, company_name, created_at, verification_status, profile_completed, email')
      .order('created_at', { ascending: false })
      .limit(500)
    const { data: rows, error: pErr } = await query
    if (pErr) {
      console.error('❌ Profiles query error:', pErr)
      return NextResponse.json({ error: 'Failed to fetch users', details: pErr.message }, { status: 500 })
    }

    const profileUsers = ((rows || []).map((u: any) => {
      const au = authById.get(u.id)
      // Prioritize email from auth.users, then from profiles.email, then null
      const email = au?.email || u.email || null
      const fullName = u.full_name || (au?.user_metadata?.full_name as string) || (email ? email.split('@')[0] : 'User')
      const role = u.role || (au?.user_metadata?.role as string) || 'client'
      const metaStatus = (au?.user_metadata as any)?.status as string | undefined
      const verificationStatus = u.verification_status as string | undefined
      
      console.log('👤 Processing user:', { 
        id: u.id, 
        email, 
        role, 
        verificationStatus,
        metaStatus,
        hasAuthUser: !!au,
        authUserEmail: au?.email,
        profileEmail: u.email
      })
      
      // Use verification_status from profiles table as the primary source
      // Fallback to user_metadata.status if verification_status is not set
      let status: string
      
      // Admin users should always be active
      if (role === 'admin') {
        status = 'active'
      } else if (verificationStatus) {
        // Map verification_status to UI status
        status = verificationStatus === 'approved' ? 'active' : 
                verificationStatus === 'pending' ? 'pending' : 
                verificationStatus === 'rejected' ? 'inactive' : 'pending'
      } else if (metaStatus) {
        // Fallback to user_metadata.status
        status = metaStatus === 'suspended' ? 'suspended' :
                metaStatus === 'pending' ? 'pending' :
                metaStatus === 'approved' ? 'active' : 'pending'
      } else {
        // Default to pending for new users
        status = 'pending'
      }
      
      // Debug logging for Digital Morph
      if (u.full_name === 'Digital Morph') {
        console.log('🔍 Digital Morph status determination:', {
          verificationStatus,
          metaStatus,
          finalStatus: status,
          role
        })
      }
      
      return {
        id: u.id,
        email,
        full_name: fullName,
        role,
        phone: u.phone || null,
        company_name: u.company_name || null,
        created_at: u.created_at,
        last_sign_in: au?.last_sign_in_at ? String(au.last_sign_in_at) : null,
        status,
        verification_status: u.verification_status || 'pending',
        is_verified: au ? !!au.email_confirmed_at : (email ? true : false), // If we have email, assume verified
        two_factor_enabled: au ? (Array.isArray((au as any).factors) && (au as any).factors.length > 0) : false
      }
    })) as any[]

    // Include any auth users that do not yet have profiles (treat as pending)
    let merged: any[] = [...profileUsers]
    if (authUsers?.length) {
      const seen = new Set(merged.map(u => u.id))
      for (const au of authUsers) {
        if (seen.has(au.id)) continue
        merged.push({
          id: au.id,
          email: au.email,
          full_name: (au.user_metadata?.full_name as string) || (au.email ? au.email.split('@')[0] : 'User'),
          role: (au.user_metadata?.role as string) || 'client',
          phone: null,
          company_name: null,
          created_at: au.created_at,
          last_sign_in: au.last_sign_in_at ? String(au.last_sign_in_at) : null,
          status: 'pending',
          verification_status: 'pending',
          is_verified: !!au.email_confirmed_at,
          two_factor_enabled: Array.isArray((au as any).factors) && (au as any).factors.length > 0
        })
      }
      // Sort by created_at desc
      merged.sort((a, b) => (new Date(b.created_at).getTime()) - (new Date(a.created_at).getTime()))
    }

    // In-memory filter across full_name, role, and auth email to avoid relying on profiles.email
    let finalUsers = merged
    if (q) {
      const s = q.toLowerCase()
      finalUsers = merged.filter(u =>
        (u.full_name || '').toLowerCase().includes(s) ||
        (u.email || '').toLowerCase().includes(s) ||
        (u.role || '').toLowerCase().includes(s)
      )
    }

    console.log('📤 Returning users:', { 
      count: finalUsers.length,
      sample: finalUsers.slice(0, 2).map(u => ({ 
        id: u.id, 
        name: u.full_name, 
        role: u.role, 
        status: u.status,
        verification_status: u.verification_status
      })),
      digitalMorph: finalUsers.find(u => u.full_name === 'Digital Morph') ? {
        name: finalUsers.find(u => u.full_name === 'Digital Morph')?.full_name,
        status: finalUsers.find(u => u.full_name === 'Digital Morph')?.status,
        verification_status: finalUsers.find(u => u.full_name === 'Digital Morph')?.verification_status
      } : 'Not found',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ users: finalUsers })
  } catch (e: any) {
    console.error('❌ Admin users API unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


