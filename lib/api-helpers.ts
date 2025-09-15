import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseClient, getSupabaseAdminClient } from './supabase'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export function withCors(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value as string))
  return response
}

export function ok(body: any, init: number | ResponseInit = 200) {
  const response = NextResponse.json(body, typeof init === 'number' ? { status: init } : init)
  return withCors(response)
}

export function created(body: any) {
  return ok(body, 201)
}

export function badRequest(message = 'Invalid request', details?: any) {
  return withCors(NextResponse.json({ error: message, details }, { status: 400 }))
}

export function unauthorized(message = 'Unauthorized', details?: any) {
  return withCors(NextResponse.json({ error: message, details }, { status: 401 }))
}

export function forbidden(message = 'Forbidden', details?: any) {
  return withCors(NextResponse.json({ error: message, details }, { status: 403 }))
}

export function notFound(message = 'Not found', details?: any) {
  return withCors(NextResponse.json({ error: message, details }, { status: 404 }))
}

export function internalError(message = 'Internal server error', details?: any) {
  return withCors(NextResponse.json({ error: message, details }, { status: 500 }))
}

export const uuidSchema = z.string().uuid('Invalid UUID')

export function requireUuid(value: unknown, name = 'id') {
  const result = uuidSchema.safeParse(value)
  if (!result.success) {
    return { valid: false as const, response: badRequest(`${name} is invalid`, result.error.errors) }
  }
  return { valid: true as const, value: result.data }
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown) {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    return { valid: false as const, response: badRequest('Invalid request data', parsed.error.errors) }
  }
  return { valid: true as const, data: parsed.data }
}

export async function getUserFromRequest(request: NextRequest, useAdmin = false) {
  const supabase = useAdmin ? await getSupabaseAdminClient() : await getSupabaseClient()

  let user: any = null
  let authError: any = null

  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: { user: tokenUser }, error } = await supabase.auth.getUser(token)
    if (tokenUser && !error) {
      user = tokenUser
    } else {
      authError = error
    }
  }

  if (!user) {
    const { data: { user: cookieUser }, error } = await supabase.auth.getUser()
    if (cookieUser && !error) {
      user = cookieUser
    } else {
      authError = error
    }
  }

  return { user, authError, supabase }
}

export function handleOptions() {
  return new Response(null, { status: 200, headers: corsHeaders })
}
