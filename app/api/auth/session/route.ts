import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const { access_token, refresh_token, expires_at } = await req.json()
		if (!access_token || !refresh_token || !expires_at) {
			return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
		}

		const res = NextResponse.json({ ok: true })
		const expires = new Date((Number(expires_at) || 0) * 1000)

		res.cookies.set('sb-access-token', access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			expires
		})
		res.cookies.set('sb-refresh-token', refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			// Let refresh token live longer; browsers cap long expirations, but it's fine
			expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		})
		return res
	} catch (e) {
		return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
	}
}

export async function DELETE() {
	const res = NextResponse.json({ ok: true })
	res.cookies.set('sb-access-token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(0) })
	res.cookies.set('sb-refresh-token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(0) })
	return res
}
