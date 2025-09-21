import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/error-boundary'
import '@/lib/error-handler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Business Services Hub - Trusted Service Providers in Oman',
  description: 'Connect with verified business service providers in Oman. Find digital marketing, legal services, accounting, IT services, and more. Quality guaranteed with 5000+ happy customers.',
  keywords: 'business services Oman, service providers Muscat, digital marketing Oman, legal services Oman, accounting services, IT services, business consulting, verified providers',
  authors: [{ name: 'Business Services Hub' }],
  creator: 'Business Services Hub',
  publisher: 'Business Services Hub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://marketing.thedigitalmorph.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Business Services Hub - Trusted Service Providers in Oman',
    description: 'Connect with verified business service providers in Oman. Find digital marketing, legal services, accounting, IT services, and more. Quality guaranteed with 5000+ happy customers.',
    url: 'https://marketing.thedigitalmorph.com',
    siteName: 'Business Services Hub',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Business Services Hub - Trusted Service Providers in Oman',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Services Hub - Trusted Service Providers in Oman',
    description: 'Connect with verified business service providers in Oman. Quality guaranteed with 5000+ happy customers.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
            <Toaster position="top-right" />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
