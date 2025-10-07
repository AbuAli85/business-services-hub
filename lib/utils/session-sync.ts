export async function syncSessionCookies(access_token: string, refresh_token: string, expires_at: number): Promise<void> {
	try {
		console.log('🔄 Starting session sync...', {
			hasAccessToken: !!access_token,
			hasRefreshToken: !!refresh_token,
			expiresAt: expires_at,
			tokenLength: access_token?.length,
			refreshTokenLength: refresh_token?.length
		})

		const response = await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include', // Important for cookies
			body: JSON.stringify({ access_token, refresh_token, expires_at })
		})
		
		if (!response.ok) {
			const errorText = await response.text()
			console.error('❌ Session sync API error:', {
				status: response.status,
				statusText: response.statusText,
				errorText
			})
			throw new Error(`Session sync failed: ${response.status} ${response.statusText} - ${errorText}`)
		}
		
		console.log('✅ Session cookies synchronized successfully')
		
		// Verify cookies were set
		await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for cookie setting
		
		const cookies = document.cookie.split(';').map(c => c.trim())
		const hasAccessToken = cookies.some(c => c.startsWith('sb-access-token='))
		const hasRefreshToken = cookies.some(c => c.startsWith('sb-refresh-token='))
		
		console.log('🔍 Cookie verification:', { 
			hasAccessToken, 
			hasRefreshToken,
			allCookies: cookies.filter(c => c.includes('sb-'))
		})
		
		if (!hasAccessToken || !hasRefreshToken) {
			console.warn('⚠️ Cookies verification failed, but continuing...')
			// Don't throw error here as the API might have set HttpOnly cookies
		}
		
	} catch (error) {
		console.error('❌ Session sync error:', error)
		throw error
	}
}

export async function clearSessionCookies(): Promise<void> {
	await fetch('/api/auth/session', { method: 'DELETE' })
}
