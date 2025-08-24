import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables should be available at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client only when needed (not at build time)
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: return null or throw error
    throw new Error('Supabase client cannot be used on server-side')
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables not configured:')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    console.error('Environment:', process.env.NODE_ENV)
    console.error('Please check your environment variables configuration.')
    
    if (process.env.NODE_ENV === 'production') {
      console.error('For production deployments, ensure environment variables are set in your hosting platform (Vercel, Netlify, etc.)')
    } else {
      console.error('For local development, check your .env.local file and restart the development server.')
    }
    
    throw new Error('Supabase environment variables not configured. Please check your environment variables configuration.')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

// Safe client getter that returns null if environment variables are missing
export function getSupabaseClientSafe() {
  if (typeof window === 'undefined') {
    return null
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Client will return null.')
    return null
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

// Service role client for admin operations (server-side only)
export function getSupabaseAdminClient() {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Create a client instance that can be used directly
let supabaseClient: SupabaseClient | null = null

export function getClient() {
  if (!supabaseClient && typeof window !== 'undefined') {
    supabaseClient = getSupabaseClient()
  }
  return supabaseClient
}

// For backward compatibility, export the functions
// These will be undefined during build time but available at runtime
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : undefined
export const supabaseAdmin = typeof window !== 'undefined' ? getSupabaseAdminClient() : undefined
