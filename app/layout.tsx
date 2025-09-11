import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/error-boundary'
import '@/lib/error-handler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Business Services Hub',
  description: 'Connect with trusted business service providers in Oman',
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
