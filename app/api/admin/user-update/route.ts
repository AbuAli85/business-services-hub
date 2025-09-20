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

      // 2) Ensure profile exists and update it
      if (status !== undefined) {
        try {
          // Map UI status to verification_status
          const verificationStatus = status === 'approved' ? 'approved' :
                                   status === 'active' ? 'approved' :
                                   status === 'pending' ? 'pending' :
                                   status === 'suspended' ? 'suspended' :
                                   status === 'inactive' ? 'rejected' : 'pending'
          
          console.log('🔄 Ensuring profile exists and updating:', {
            userId: user_id,
            status,
            verificationStatus
          })
          
          // First, check if profile exists
          const { data: existingProfile, error: checkErr } = await admin
            .from('profiles')
            .select('id')
            .eq('id', user_id)
            .single()
          
          if (checkErr && checkErr.code === 'PGRST116') {
            console.log('🔍 Profile does not exist, creating it...')
            
            // Get user data from auth to create profile
            const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(user_id)
            if (authErr) {
              console.error('❌ Could not get auth user:', authErr.message)
            } else {
              // Create profile with basic data
              const { error: createErr } = await admin
                .from('profiles')
                .insert({
                  id: user_id,
                  full_name: authUser.user?.user_metadata?.full_name || authUser.user?.email?.split('@')[0] || 'User',
                  email: authUser.user?.email || null,
                  role: role || 'client',
                  verification_status: verificationStatus,
                  created_at: new Date().toISOString()
                })
              
              if (createErr) {
                console.error('❌ Profile creation failed:', createErr.message)
              } else {
                console.log('✅ Profile created successfully')
              }
            }
          } else if (checkErr) {
            console.error('❌ Error checking profile:', checkErr.message)
          } else {
            console.log('🔍 Profile exists, updating it...')
            
            // Profile exists, update it
            const { data: updateResult, error: updateErr } = await admin
              .from('profiles')
              .update({ 
                verification_status: verificationStatus,
                ...(role !== undefined ? { role } : {})
              })
              .eq('id', user_id)
              .select('id, verification_status, role')
            
            if (updateErr) {
              console.error('❌ Profile update failed:', updateErr.message)
            } else {
              console.log('✅ Profile update successful:', updateResult)
            }
          }
        } catch (e: any) {
          console.error('❌ Profiles update error:', e?.message || e)
        }
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
         const { data: verifyProfile, error: verifyError } = await admin
           .from('profiles')
           .select('id, verification_status, role')
           .eq('id', user_id)
           .single()
         
         if (verifyError) {
           console.log('❌ Verification failed:', verifyError)
         } else {
           console.log('✅ Verification after update:', verifyProfile)
         }
       } catch (e) {
         console.warn('Could not verify update:', e)
       }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Admin user-update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


