import { NextResponse } from 'next/server'

// Handle stray POSTs to this path gracefully to avoid 405s in production
export async function POST(_req: Request) {
  return NextResponse.json({ ok: true })
}

// Allow CORS/preflight and advertise allowed methods
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
