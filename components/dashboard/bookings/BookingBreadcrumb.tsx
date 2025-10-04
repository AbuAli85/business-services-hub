import React from 'react'
import { ChevronRight, Home, Package, Calendar, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BookingBreadcrumbProps {
  current: string
  bookingId?: string
  bookingTitle?: string
  className?: string
}

export function BookingBreadcrumb({ 
  current, 
  bookingId, 
  bookingTitle, 
  className = '' 
}: BookingBreadcrumbProps) {
  const router = useRouter()

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <Home className="h-4 w-4" />
      },
      {
        label: 'Bookings',
        href: '/dashboard/bookings',
        icon: <List className="h-4 w-4" />
      }
    ]

    // Add booking-specific breadcrumbs if we have booking info
    if (bookingId && current !== 'Bookings') {
      items.push({
        label: bookingTitle || `Booking #${bookingId.slice(0, 8)}`,
        href: `/dashboard/bookings/${bookingId}`,
        icon: <Package className="h-4 w-4" />
      })
    }

    // Add current page if it's not already in the path
    if (current === 'Milestones' && bookingId) {
      items.push({
        label: 'Milestones',
        icon: <Calendar className="h-4 w-4" />
      })
    }

    return items
  }

  const breadcrumbItems = getBreadcrumbItems()

  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          
          {item.href ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item.href!)}
              className="p-0 h-auto text-gray-600 hover:text-gray-900 font-normal flex items-center gap-1"
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </Button>
          ) : (
            <span className="text-gray-900 font-medium flex items-center gap-1">
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
