export async function syncSessionCookies(access_token: string, refresh_token: string, expires_at: number): Promise<void> {
	await fetch('/api/auth/session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ access_token, refresh_token, expires_at })
	})
}

export async function clearSessionCookies(): Promise<void> {
	await fetch('/api/auth/session', { method: 'DELETE' })
}
