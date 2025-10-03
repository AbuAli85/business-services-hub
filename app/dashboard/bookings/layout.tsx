import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookings | Business Services Hub',
  description: 'Manage and track all your service bookings, appointments, and project milestones in one place.',
  openGraph: {
    title: 'Bookings - Business Services Hub',
    description: 'Manage and track all your service bookings and appointments',
    url: 'https://marketing.thedigitalmorph.com/dashboard/bookings',
    siteName: 'Business Services Hub',
    type: 'website',
  },
  robots: {
    index: false, // Dashboard pages should not be indexed
    follow: false,
  },
}

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

