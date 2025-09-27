import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get users with roles using the new RPC function
    const { data: users, error } = await supabase
      .rpc('get_users_with_roles')

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error.message },
        { status: 500 }
      )
    }

    // Filter by role if specified
    let filteredUsers = users
    if (role) {
      filteredUsers = users.filter((user: any) => 
        user.roles.some((r: any) => r.name === role && r.is_active)
      )
    }

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offset, offset + limit)

    return NextResponse.json({
      users: paginatedUsers,
      total: filteredUsers.length,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, roleName, assignedBy } = body

    if (action === 'assign_role') {
      if (!userId || !roleName) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, roleName' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .rpc('assign_user_role', {
          target_user_id: userId,
          role_name: roleName,
          assigned_by_user_id: assignedBy
        })

      if (error) {
        console.error('Error assigning role:', error)
        return NextResponse.json(
          { error: 'Failed to assign role', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })

    } else if (action === 'remove_role') {
      if (!userId || !roleName) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, roleName' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .rpc('remove_user_role', {
          target_user_id: userId,
          role_name: roleName
        })

      if (error) {
        console.error('Error removing role:', error)
        return NextResponse.json(
          { error: 'Failed to remove role', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: assign_role, remove_role' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in users API POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
