/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.imgix.net' },
      { protocol: 'https', hostname: '**.googleusercontent.com' }
    ],
    formats: ['image/avif','image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Exclude Supabase functions from Next.js build
  webpack: (config) => {
    // Exclude Supabase functions directory from compilation
    config.module.rules.push({
      test: /supabase\/functions\/.*\.ts$/,
      use: 'ignore-loader'
    })
    
    // Exclude the supabase-functions directory
    config.module.rules.push({
      test: /supabase-functions\/.*\.ts$/,
      use: 'ignore-loader'
    })
    
    // Exclude the supabase-functions-backup directory
    config.module.rules.push({
      test: /supabase-functions-backup\/.*\.ts$/,
      use: 'ignore-loader'
    })
    
    return config
  },
  // Force cache busting for production builds
  generateBuildId: async () => {
    return `build-${Date.now()}-${Math.random().toString(36).slice(2)}`
  },
  // Disable static optimization for dynamic content
  experimental: {
    // Force dynamic rendering for better cache control
    forceSwcTransforms: true,
  },
  // Add cache headers to prevent stale content
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "script-src 'self' 'unsafe-inline' https: https://js.hcaptcha.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
              "connect-src 'self' https: wss: https://vercel.live https://*.vercel.live wss://*.vercel.live https://hcaptcha.com https://*.hcaptcha.com",
              "frame-src 'self' https://vercel.live https://*.vercel.live https://hcaptcha.com https://*.hcaptcha.com https://newassets.hcaptcha.com",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/contact', destination: '/contact/', permanent: true },
    ]
  },
}

export default nextConfig
