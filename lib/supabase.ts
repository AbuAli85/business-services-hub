import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables should be available at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton pattern to prevent multiple client instances
let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null
let isInitializing = false
let initializationPromise: Promise<SupabaseClient> | null = null

// Helper function to check environment variables (moved outside async function)
function checkEnvironmentVariables() {
  const missingVars = []
  
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    supabaseUrl,
    supabaseAnonKey
  }
}

// Create Supabase client only when needed (not at build time)
export async function getSupabaseClient(): Promise<SupabaseClient> {
  // Return existing client immediately if already created
  if (supabaseClient) {
    return supabaseClient
  }

  // If already initializing, wait for the existing promise
  if (isInitializing && initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  isInitializing = true
  initializationPromise = initializeSupabaseClient()
  
  try {
    const client = await initializationPromise
    return client
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
    throw new Error('Could not initialize Supabase client. Please check your environment variables.')
  } finally {
    isInitializing = false
    initializationPromise = null
  }
}

// Separate initialization function to avoid blocking
async function initializeSupabaseClient(): Promise<SupabaseClient> {
  const envCheck = checkEnvironmentVariables()
  
  if (!envCheck.isValid) {
    const errorMessage = `Supabase environment variables not configured:
    
Missing variables: ${envCheck.missingVars.join(', ')}

Available variables:
- NEXT_PUBLIC_SUPABASE_URL: ${envCheck.supabaseUrl ? '✅ Set' : '❌ Missing'}
- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${envCheck.supabaseAnonKey ? '✅ Set' : '❌ Missing'}

Environment: ${process.env.NODE_ENV}

To fix this:
1. Copy env.example to .env.local
2. Update the values in .env.local
3. Restart your development server

For production deployments, ensure environment variables are set in your hosting platform.`

    console.error(errorMessage)
    throw new Error('Supabase environment variables not configured. Please check your .env.local file and restart the development server.')
  }
  
  // At this point, we know both variables are defined due to the check above
  const url = envCheck.supabaseUrl!
  const key = envCheck.supabaseAnonKey!
  
  // Create new client
  supabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'business-services-hub'
      }
    }
  })
  
  // Set up background tasks without blocking the main thread
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback or setTimeout to defer non-critical operations
    const deferSetup = () => {
      try {
        // Set up auth state change listener
        supabaseClient!.auth.onAuthStateChange(async (event, session) => {
          console.log('🔐 Auth state changed:', event, session?.user?.id ? 'User logged in' : 'No user')
          
          if (event === 'TOKEN_REFRESHED') {
            console.log('✅ Token refreshed successfully')
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out')
          }
        })
        
        // Test the client connection in background
        testClientConnection(supabaseClient!)
      } catch (error) {
        console.warn('⚠️ Background setup failed:', error)
      }
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(deferSetup, { timeout: 1000 })
    } else {
      setTimeout(deferSetup, 0)
    }
  } else {
    // Server-side: just log successful connection
    console.log('✅ Supabase client created for server-side usage')
  }
  
  return supabaseClient
}

// Separate function for testing client connection
async function testClientConnection(client: SupabaseClient) {
  try {
    const { data: { session }, error } = await client.auth.getSession()
    if (error) {
      console.warn('⚠️ Supabase client connection test failed:', error)
    } else if (session) {
      console.log('✅ Supabase client connected successfully with active session')
      console.log('👤 User ID:', session.user.id)
      console.log('🔄 Session expires:', new Date(session.expires_at! * 1000).toLocaleString())
    } else {
      console.log('✅ Supabase client connected successfully (no active session)')
    }
  } catch (testError) {
    console.warn('⚠️ Supabase client connection test error:', testError)
  }
}

// Enhanced function to get authenticated client with session refresh
export async function getAuthenticatedClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClient()
  
  // Check if we have a valid session
  const { data: { session }, error } = await client.auth.getSession()
  
  if (error) {
    console.error('❌ Error getting session:', error)
    throw new Error('Authentication error: ' + error.message)
  }
  
  if (!session) {
    console.error('❌ No active session found')
    throw new Error('No active session. Please sign in again.')
  }
  
  // Check if session is expired or about to expire (within 5 minutes)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at || 0
  const timeUntilExpiry = expiresAt - now
  
  if (timeUntilExpiry <= 300) { // 5 minutes
    console.log('🔄 Session expires soon, refreshing...')
    try {
      const { data: { session: refreshedSession }, error: refreshError } = await client.auth.refreshSession()
      if (refreshError) {
        console.error('❌ Failed to refresh session:', refreshError)
        throw new Error('Session refresh failed: ' + refreshError.message)
      }
      if (refreshedSession) {
        console.log('✅ Session refreshed successfully')
      }
    } catch (refreshError) {
      console.error('❌ Session refresh error:', refreshError)
      throw new Error('Session refresh failed. Please sign in again.')
    }
  }
  
  return client
}

// Safe client getter that returns null if environment variables are missing
export function getSupabaseClientSafe(): SupabaseClient | null {
  const envCheck = checkEnvironmentVariables()
  
  if (!envCheck.isValid) {
    console.warn(`Supabase environment variables not configured. Client will return null.
Missing: ${envCheck.missingVars.join(', ')}`)
    return null
  }
  
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }
  
  // At this point, we know both variables are defined due to the check above
  // TypeScript assertion is safe here
  const url = envCheck.supabaseUrl!
  const key = envCheck.supabaseAnonKey!
  
  // Create new client only once
  supabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
  
  return supabaseClient
}

// Service role client for admin operations (server-side only)
export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    throw new Error(`Supabase admin environment variables not configured:
Missing: ${missingVars.join(', ')}

Please check your .env.local file and ensure all required variables are set.`)
  }
  
  // Return existing admin client if already created
  if (supabaseAdminClient) {
    return supabaseAdminClient
  }
  
  // At this point, we know both variables are defined due to the check above
  // TypeScript assertion is safe here
  const url = supabaseUrl!
  const key = supabaseKey!
  
  // Create new admin client only once
  supabaseAdminClient = createClient(url, key)
  
  return supabaseAdminClient
}

// For backward compatibility, export the functions
// These will be undefined during build time but available at runtime
export const supabase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  ? getSupabaseClient() 
  : undefined

export const supabaseAdmin = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? getSupabaseAdminClient() 
  : undefined

// Cleanup function for testing purposes
export function clearSupabaseClients() {
  supabaseClient = null
  supabaseAdminClient = null
}

// Function to check if environment is properly configured
export function isEnvironmentConfigured(): boolean {
  try {
    const envCheck = checkEnvironmentVariables()
    return envCheck.isValid
  } catch {
    return false
  }
}

// Function to get environment status for debugging
export function getEnvironmentStatus() {
  return {
    isClient: typeof window !== 'undefined',
    envCheck: checkEnvironmentVariables(),
    nodeEnv: process.env.NODE_ENV,
    hasClient: supabaseClient !== null,
    hasAdminClient: supabaseAdminClient !== null
  }
}
