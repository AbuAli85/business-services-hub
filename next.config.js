/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'supabase.co'],
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
