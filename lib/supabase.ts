import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables should be available at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton pattern to prevent multiple client instances
let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null

// Helper function to check environment variables
function checkEnvironmentVariables() {
  const missingVars = []
  
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  // Log environment status for debugging
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'missing',
    nodeEnv: process.env.NODE_ENV
  })
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    supabaseUrl,
    supabaseAnonKey
  }
}

// Create Supabase client only when needed (not at build time)
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    // Server-side: return null or throw error
    throw new Error('Supabase client cannot be used on server-side')
  }
  
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
  
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create new client only once
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'business-services-hub'
      }
    }
  })
  
  // Test the client connection
  try {
    const { data, error } = await supabaseClient.auth.getSession()
    if (error) {
      console.warn('Supabase client connection test failed:', error)
    } else {
      console.log('Supabase client connected successfully')
    }
  } catch (testError) {
    console.warn('Supabase client connection test error:', testError)
  }
  
  return supabaseClient
}

// Safe client getter that returns null if environment variables are missing
export function getSupabaseClientSafe(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null
  }
  
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
  
  // Create new client only once
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
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
  
  // Create new admin client only once
  supabaseAdminClient = createClient(supabaseUrl, supabaseKey)
  
  return supabaseAdminClient
}

// For backward compatibility, export the functions
// These will be undefined during build time but available at runtime
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : undefined
export const supabaseAdmin = typeof window !== 'undefined' ? getSupabaseAdminClient() : undefined

// Cleanup function for testing purposes
export function clearSupabaseClients() {
  supabaseClient = null
  supabaseAdminClient = null
}

// Function to check if environment is properly configured
export function isEnvironmentConfigured(): boolean {
  if (typeof window === 'undefined') return false
  
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
