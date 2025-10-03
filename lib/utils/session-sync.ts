export async function syncSessionCookies(access_token: string, refresh_token: string, expires_at: number): Promise<void> {
	try {
		const response = await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ access_token, refresh_token, expires_at })
		})
		
		if (!response.ok) {
			throw new Error(`Session sync failed: ${response.status} ${response.statusText}`)
		}
		
		console.log('✅ Session cookies synchronized successfully')
	} catch (error) {
		console.error('❌ Session sync error:', error)
		throw error
	}
}

export async function clearSessionCookies(): Promise<void> {
	await fetch('/api/auth/session', { method: 'DELETE' })
}
