import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get all users who have active bookings
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or('role.eq.admin,role.eq.provider,role.eq.client')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' }, { status: 200 })
    }

    // Send weekly digest to each user
    const results = []
    for (const user of users) {
      try {
        // Generate weekly digest data
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of current week
        
        const { data: digestData, error: digestError } = await supabase
          .rpc('get_weekly_digest_data', {
            p_user_id: user.id,
            p_week_start: weekStart.toISOString().split('T')[0]
          })

        if (digestError) {
          console.error(`Error generating digest for user ${user.id}:`, digestError)
          continue
        }

        // Send digest notification
        const { error: notificationError } = await supabase
          .rpc('send_weekly_digest', {
            p_user_id: user.id
          })

        if (notificationError) {
          console.error(`Error sending digest notification for user ${user.id}:`, notificationError)
          continue
        }

        // Send email digest
        await sendEmailDigest(user, digestData)

        results.push({
          user_id: user.id,
          status: 'success'
        })
      } catch (error) {
        console.error(`Error processing digest for user ${user.id}:`, error)
        results.push({
          user_id: user.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Weekly digest sent',
      results,
      total_users: users.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length
    })

  } catch (error) {
    console.error('Error in weekly digest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendEmailDigest(user: any, digestData: any) {
  try {
    // Generate email content
    const emailContent = generateEmailContent(user, digestData)
    
    // Send email via your email service (SendGrid, Resend, etc.)
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        subject: `Weekly Progress Digest - ${new Date().toLocaleDateString()}`,
        html: emailContent.html,
        text: emailContent.text
      })
    })

    if (!response.ok) {
      console.error(`Failed to send email to ${user.email}`)
    }
  } catch (error) {
    console.error(`Error sending email to ${user.email}:`, error)
  }
}

function generateEmailContent(user: any, digestData: any) {
  const weekStart = new Date(digestData.week_start)
  const weekEnd = new Date(digestData.week_end)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Progress Digest</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; font-size: 0.9em; }
        .overdue { color: #dc3545; }
        .completed { color: #28a745; }
        .pending { color: #ffc107; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 0.9em; color: #666; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Weekly Progress Digest</h1>
          <p>Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</p>
        </div>
        
        <div class="content">
          <h2>Hello ${user.full_name}!</h2>
          <p>Here's your weekly progress summary from Business Services Hub:</p>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${digestData.tasks?.total || 0}</div>
              <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-card">
              <div class="stat-number completed">${digestData.tasks?.completed_this_week || 0}</div>
              <div class="stat-label">Completed This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-number overdue">${digestData.tasks?.overdue || 0}</div>
              <div class="stat-label">Overdue Tasks</div>
            </div>
            <div class="stat-card">
              <div class="stat-number pending">${digestData.tasks?.pending_approval || 0}</div>
              <div class="stat-label">Pending Approval</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">${digestData.progress?.average || 0}%</div>
            <div class="stat-label">Average Progress</div>
          </div>
          
          ${digestData.tasks?.overdue > 0 ? `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>⚠️ Attention Required:</strong> You have ${digestData.tasks.overdue} overdue task(s) that need immediate attention.
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">View Dashboard</a>
          </div>
          
          <p>Keep up the great work! If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from Business Services Hub.</p>
          <p>© ${new Date().getFullYear()} Business Services Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Weekly Progress Digest - ${new Date().toLocaleDateString()}

Hello ${user.full_name}!

Here's your weekly progress summary:

📊 STATISTICS:
- Total Tasks: ${digestData.tasks?.total || 0}
- Completed This Week: ${digestData.tasks?.completed_this_week || 0}
- Overdue Tasks: ${digestData.tasks?.overdue || 0}
- Pending Approval: ${digestData.tasks?.pending_approval || 0}
- Average Progress: ${digestData.progress?.average || 0}%

${digestData.tasks?.overdue > 0 ? `⚠️ ATTENTION: You have ${digestData.tasks.overdue} overdue task(s) that need immediate attention.` : ''}

View your dashboard: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard

Best regards,
Business Services Hub Team
  `

  return { html, text }
}

// Manual trigger endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  
  if (!userId) {
    return NextResponse.json({ error: 'user_id parameter required' }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseClient()
    
    // Generate digest for specific user
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    
    const { data: digestData, error: digestError } = await supabase
      .rpc('get_weekly_digest_data', {
        p_user_id: userId,
        p_week_start: weekStart.toISOString().split('T')[0]
      })

    if (digestError) {
      return NextResponse.json({ error: digestError.message }, { status: 500 })
    }

    // Send digest
    const { error: notificationError } = await supabase
      .rpc('send_weekly_digest', {
        p_user_id: userId
      })

    if (notificationError) {
      return NextResponse.json({ error: notificationError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Weekly digest sent successfully',
      user_id: userId,
      digest_data: digestData
    })

  } catch (error) {
    console.error('Error in manual weekly digest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
