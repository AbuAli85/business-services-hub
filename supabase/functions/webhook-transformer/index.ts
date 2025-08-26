import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Environment variables for Make.com webhooks
const MAKE_WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL') || 'https://hook.eu2.make.com/ckseohqanys963qtkf773le623k2up7l'
const MAKE_WEBHOOK_ID = Deno.env.get('MAKE_WEBHOOK_ID') || 'services-webhook'

// UUID validation function
function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(trimmed)
}

// Transform database record to Make.com webhook format
function transformServiceData(record: any, operation: string) {
  // Validate required UUIDs
  if (!isValidUuid(record.id)) {
    throw new Error(`Invalid service_id: ${record.id}`)
  }
  if (!isValidUuid(record.provider_id)) {
    throw new Error(`Invalid provider_id: ${record.provider_id}`)
  }

  // Transform to Make.com expected format
  return {
    event: 'new-service-created',
    webhook_id: MAKE_WEBHOOK_ID,
    data: {
      service_id: record.id,
      provider_id: record.provider_id,
      service_name: record.title || 'Untitled Service',
      operation: operation,
      timestamp: new Date().toISOString()
    }
  }
}

// Transform booking data
function transformBookingData(record: any, operation: string) {
  if (!isValidUuid(record.id)) {
    throw new Error(`Invalid booking_id: ${record.id}`)
  }
  if (!isValidUuid(record.client_id)) {
    throw new Error(`Invalid client_id: ${record.client_id}`)
  }
  if (!isValidUuid(record.service_id)) {
    throw new Error(`Invalid service_id: ${record.service_id}`)
  }

  return {
    event: 'booking-created',
    webhook_id: 'bookings-webhook',
    data: {
      booking_id: record.id,
      client_id: record.client_id,
      provider_id: record.provider_id,
      service_id: record.service_id,
      status: record.status || 'draft',
      total_cost: record.total_cost || 0,
      operation: operation,
      timestamp: new Date().toISOString()
    }
  }
}

// Transform profile data
function transformProfileData(record: any, operation: string) {
  if (!isValidUuid(record.id)) {
    throw new Error(`Invalid user_id: ${record.id}`)
  }

  return {
    event: 'user-registered',
    webhook_id: 'profiles-webhook',
    data: {
      user_id: record.id,
      full_name: record.full_name || '',
      role: record.role || 'client',
      operation: operation,
      timestamp: new Date().toISOString()
    }
  }
}

// Forward webhook to Make.com
async function forwardToMakeCom(payload: any) {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Webhook-Transformer/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    console.log('✅ Successfully forwarded to Make.com:', result)
    return { success: true, response: result }
  } catch (error) {
    console.error('❌ Failed to forward to Make.com:', error)
    throw error
  }
}

// Main handler function
serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the incoming webhook data
    const body = await req.json()
    console.log('🔍 Received webhook data:', JSON.stringify(body, null, 2))

    // Extract table and operation information
    const { table, type, record, old_record } = body

    if (!table || !type || !record) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload. Missing table, type, or record.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let transformedPayload: any

    // Transform data based on table and operation
    switch (table) {
      case 'services':
        if (type === 'INSERT') {
          transformedPayload = transformServiceData(record, 'INSERT')
        } else {
          return new Response(
            JSON.stringify({ message: `Ignoring ${type} operation on services table` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        break

      case 'bookings':
        if (type === 'INSERT') {
          transformedPayload = transformBookingData(record, 'INSERT')
        } else {
          return new Response(
            JSON.stringify({ message: `Ignoring ${type} operation on bookings table` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        break

      case 'profiles':
        if (type === 'INSERT') {
          transformedPayload = transformProfileData(record, 'INSERT')
        } else {
          return new Response(
            JSON.stringify({ message: `Ignoring ${type} operation on profiles table` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        break

      default:
        return new Response(
          JSON.stringify({ message: `Unsupported table: ${table}` }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Forward the transformed payload to Make.com
    const result = await forwardToMakeCom(transformedPayload)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${table} ${type} event`,
        transformed_payload: transformedPayload,
        make_com_result: result
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
