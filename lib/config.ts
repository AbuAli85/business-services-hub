// Configuration file for environment variables
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://marketing.thedigitalmorph.com',
    environment: process.env.NODE_ENV || 'development'
  }
}

// Validate configuration
export function validateConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing)
    console.warn('Using fallback values from config')
  }
  
  return missing.length === 0
}

// Check if we're in production
export const isProduction = config.app.environment === 'production'
export const isDevelopment = config.app.environment === 'development'

