import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'PDF endpoint test - GET method works!',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ 
    message: 'PDF endpoint test - POST method works!',
    timestamp: new Date().toISOString(),
    body: body
  })
}
