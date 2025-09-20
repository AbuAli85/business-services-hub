import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, status, role } = body || {}
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Require admin via Bearer token (works from client fetch)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = tokenUser.user.id
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') {
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if ((me?.role || 'client') !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update role/status across auth metadata and profiles (if column exists)
    if (status !== undefined || role !== undefined) {
      // 1) Update auth metadata for canonical source of truth
      try {
        const metadataUpdate: any = {}
        if (role !== undefined) metadataUpdate.role = role
        if (status !== undefined) {
          // Map status to a more explicit format for metadata
          metadataUpdate.status = status
          metadataUpdate.verification_status = status === 'approved' ? 'approved' :
                                            status === 'active' ? 'approved' :
                                            status === 'pending' ? 'pending' :
                                            status === 'suspended' ? 'suspended' :
                                            status === 'inactive' ? 'rejected' : 'pending'
        }
        
        console.log('🔄 Updating auth metadata:', {
          userId: user_id,
          metadataUpdate
        })
        
        await admin.auth.admin.updateUserById(user_id, {
          user_metadata: metadataUpdate
        } as any)
        
        console.log('✅ Auth metadata update successful')
      } catch (e: any) {
        console.error('❌ Auth metadata update failed:', e?.message || e)
      }

      // 2) Best-effort update of profiles table to reflect role/verification_status
      try {
        const update: any = {}
        if (role !== undefined) update.role = role
        if (status !== undefined) {
          // Map UI status to verification_status
          const verificationStatus = status === 'approved' ? 'approved' :
                                   status === 'active' ? 'approved' :
                                   status === 'pending' ? 'pending' :
                                   status === 'suspended' ? 'suspended' :
                                   status === 'inactive' ? 'rejected' : 'pending'
          update.verification_status = verificationStatus
          console.log('🔄 Backend status update:', {
            userId: user_id,
            status,
            verificationStatus,
            update
          })
        }
        if (Object.keys(update).length > 0) {
          console.log('🔄 Updating profiles table:', {
            userId: user_id,
            update
          })
          
          // First, check if the user exists in profiles
          const { data: existingProfile, error: checkErr } = await admin
            .from('profiles')
            .select('id, verification_status')
            .eq('id', user_id)
            .single()
          
          if (checkErr) {
            console.error('❌ Error checking existing profile:', checkErr.message)
          } else {
            console.log('🔍 Existing profile:', existingProfile)
          }
          
          const { data: updateResult, error: profErr } = await admin
            .from('profiles')
            .update(update)
            .eq('id', user_id)
            .select('id, verification_status')
          
          if (profErr) {
            console.error('❌ Profiles update failed:', profErr.message)
            // Don't fail the request, just log the warning
          } else {
            console.log('✅ Profiles update successful:', updateResult)
          }
        }
      } catch (e: any) {
        // Non-fatal; rely on auth metadata
        console.warn('Profiles update failed:', e?.message || e)
      }

      // 3) Maintain user_roles table when role changes
      if (role !== undefined) {
        const { error: roleErr } = await admin
          .from('user_roles')
          .upsert({ user_id, role }, { onConflict: 'user_id' })
        if (roleErr && !roleErr.message?.includes('relation')) {
          return NextResponse.json({ error: 'Failed to upsert user role', details: roleErr.message }, { status: 400 })
        }
      }
    }

    // Optionally mark email confirmed
    if (body.verify_email === true) {
      try {
        await admin.auth.admin.updateUserById(user_id, { email_confirm: true as any })
      } catch (e: any) {
        // non-fatal
        console.warn('Email verify update failed:', e?.message || e)
      }
    }

    // Verify the update by reading the user data back
    try {
      const { data: verifyProfile } = await admin
        .from('profiles')
        .select('id, verification_status, role')
        .eq('id', user_id)
        .single()
      
      console.log('🔍 Verification after update:', verifyProfile)
    } catch (e) {
      console.warn('Could not verify update:', e)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Admin user-update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


