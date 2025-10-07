'use client'

import { 
  Home, 
  Calendar, 
  MessageSquare, 
  Bell, 
  User, 
  Settings, 
  Briefcase, 
  Package, 
  Users, 
  BarChart3, 
  FileText, 
  DollarSign,
  Building2,
  HelpCircle,
  Receipt,
  FileBarChart
} from 'lucide-react'

export interface NavigationItem {
  name: string
  href: string
  icon: any
  description?: string
  badge?: string
}

export interface User {
  id: string
  role: 'admin' | 'provider' | 'client' | 'staff' | null
  full_name?: string
  email?: string
}

export function getRoleBasedNavigation(user: User | null): NavigationItem[] {
  if (!user || !user.role) return []

  const baseItems: NavigationItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'Overview and quick actions'
    },
    { 
      name: 'Bookings', 
      href: '/dashboard/bookings', 
      icon: Calendar,
      description: 'Manage your bookings'
    },
    { 
      name: 'Messages', 
      href: '/dashboard/messages', 
      icon: MessageSquare,
      description: 'Communicate with users'
    },
    { 
      name: 'Notifications', 
      href: '/dashboard/notifications', 
      icon: Bell,
      description: 'Stay updated'
    },
    { 
      name: 'Profile', 
      href: '/dashboard/profile', 
      icon: User,
      description: 'Manage your profile'
    },
    { 
      name: 'Settings', 
      href: '/dashboard/settings', 
      icon: Settings,
      description: 'Account settings'
    },
  ]

  // Admin navigation
  if (user.role === 'admin') {
    baseItems.splice(1, 0, 
      { 
        name: 'Services (Admin)', 
        href: '/dashboard/admin/services', 
        icon: Briefcase,
        description: 'Manage all services'
      },
      { 
        name: 'Suggestions', 
        href: '/dashboard/suggestions', 
        icon: Package,
        description: 'Service suggestions'
      },
      { 
        name: 'Users', 
        href: '/dashboard/admin/users', 
        icon: Users,
        description: 'User management'
      },
      { 
        name: 'Permissions', 
        href: '/dashboard/admin/permissions', 
        icon: Settings,
        description: 'Access control'
      },
      { 
        name: 'Analytics', 
        href: '/dashboard/admin/analytics', 
        icon: BarChart3,
        description: 'System analytics'
      },
      { 
        name: 'Reports', 
        href: '/dashboard/reports/bookings', 
        icon: FileBarChart,
        description: 'Booking reports'
      },
      { 
        name: 'All Invoices', 
        href: '/dashboard/admin/invoices', 
        icon: Receipt,
        description: 'Manage all invoices',
        badge: 'Admin'
      }
    )
  }

  // Provider navigation
  if (user.role === 'provider') {
    baseItems.splice(1, 0, 
      { 
        name: 'My Services', 
        href: '/dashboard/services', 
        icon: Briefcase,
        description: 'Manage your services'
      },
      { 
        name: 'Company', 
        href: '/dashboard/company', 
        icon: Building2,
        description: 'Company profile'
      },
      { 
        name: 'Earnings', 
        href: '/dashboard/provider/earnings', 
        icon: DollarSign,
        description: 'Track your earnings'
      },
      { 
        name: 'My Invoices', 
        href: '/dashboard/provider/invoices', 
        icon: Receipt,
        description: 'Create and manage invoices',
        badge: 'New'
      },
      { 
        name: 'Reports', 
        href: '/dashboard/reports/bookings', 
        icon: FileBarChart,
        description: 'Booking reports'
      }
    )
    // Update dashboard link to use dynamic route
    baseItems[0] = { 
      name: 'Dashboard', 
      href: `/dashboard/provider/${user.id}`, 
      icon: Home,
      description: 'Provider overview'
    }
  }

  // Client navigation
  if (user.role === 'client') {
    baseItems.splice(1, 0, 
      { 
        name: 'Services', 
        href: '/dashboard/services', 
        icon: Briefcase,
        description: 'Browse available services'
      },
      { 
        name: 'Company', 
        href: '/dashboard/company', 
        icon: Building2,
        description: 'Manage your company profile'
      },
      { 
        name: 'My Invoices', 
        href: '/dashboard/client/invoices', 
        icon: Receipt,
        description: 'View and pay invoices'
      },
      { 
        name: 'Reports', 
        href: '/dashboard/reports/bookings', 
        icon: FileBarChart,
        description: 'Booking reports'
      }
    )
  }

  // Staff navigation (same as client for now)
  if (user.role === 'staff') {
    baseItems.splice(1, 0, 
      { 
        name: 'Services', 
        href: '/dashboard/services', 
        icon: Briefcase,
        description: 'Browse available services'
      },
      { 
        name: 'Company', 
        href: '/dashboard/company', 
        icon: Building2,
        description: 'Manage your company profile'
      },
      { 
        name: 'My Invoices', 
        href: '/dashboard/client/invoices', 
        icon: Receipt,
        description: 'View and pay invoices'
      },
      { 
        name: 'Reports', 
        href: '/dashboard/reports/bookings', 
        icon: FileBarChart,
        description: 'Booking reports'
      }
    )
  }

  return baseItems
}

export function getQuickActions(user: User | null): NavigationItem[] {
  if (!user || !user.role) return []

  const quickActions: NavigationItem[] = []

  if (user.role === 'provider') {
    quickActions.push(
      { 
        name: 'Create Service', 
        href: '/dashboard/services/create', 
        icon: Briefcase,
        description: 'Add a new service'
      },
      { 
        name: 'View Earnings', 
        href: '/dashboard/provider/earnings', 
        icon: DollarSign,
        description: 'Check your earnings'
      },
      { 
        name: 'Create Invoice', 
        href: '/dashboard/provider/invoices', 
        icon: Receipt,
        description: 'Generate new invoice'
      }
    )
  }

  if (user.role === 'client' || user.role === 'staff') {
    quickActions.push(
      { 
        name: 'Browse Services', 
        href: '/dashboard/services', 
        icon: Briefcase,
        description: 'Find services you need'
      },
      { 
        name: 'Manage Company', 
        href: '/dashboard/company', 
        icon: Building2,
        description: 'Update company information'
      },
      { 
        name: 'View Invoices', 
        href: '/dashboard/client/invoices', 
        icon: Receipt,
        description: 'Check your invoices'
      }
    )
  }

  if (user.role === 'admin') {
    quickActions.push(
      { 
        name: 'Manage Users', 
        href: '/dashboard/admin/users', 
        icon: Users,
        description: 'User administration'
      },
      { 
        name: 'View Analytics', 
        href: '/dashboard/admin/analytics', 
        icon: BarChart3,
        description: 'System analytics'
      },
      { 
        name: 'All Invoices', 
        href: '/dashboard/admin/invoices', 
        icon: Receipt,
        description: 'Invoice management'
      }
    )
  }

  return quickActions
}

export function getInvoiceSubNavigation(user: User | null): NavigationItem[] {
  if (!user || !user.role) return []

  const invoiceSubNav: NavigationItem[] = []

  if (user.role === 'provider') {
    invoiceSubNav.push(
      { 
        name: 'All Invoices', 
        href: '/dashboard/provider/invoices', 
        icon: FileText,
        description: 'View all your invoices'
      },
      { 
        name: 'Create Invoice', 
        href: '/dashboard/provider/invoices/create', 
        icon: Receipt,
        description: 'Create new invoice'
      },
      { 
        name: 'Draft Invoices', 
        href: '/dashboard/provider/invoices?status=draft', 
        icon: FileText,
        description: 'Draft invoices'
      },
      { 
        name: 'Paid Invoices', 
        href: '/dashboard/provider/invoices?status=paid', 
        icon: DollarSign,
        description: 'Paid invoices'
      }
    )
  }

  if (user.role === 'client' || user.role === 'staff') {
    invoiceSubNav.push(
      { 
        name: 'All Invoices', 
        href: '/dashboard/client/invoices', 
        icon: FileText,
        description: 'View all your invoices'
      },
      { 
        name: 'Pending Payment', 
        href: '/dashboard/client/invoices?status=issued', 
        icon: DollarSign,
        description: 'Invoices pending payment'
      },
      { 
        name: 'Paid Invoices', 
        href: '/dashboard/client/invoices?status=paid', 
        icon: Receipt,
        description: 'Paid invoices'
      }
    )
  }

  if (user.role === 'admin') {
    invoiceSubNav.push(
      { 
        name: 'All Invoices', 
        href: '/dashboard/admin/invoices', 
        icon: FileText,
        description: 'Manage all invoices'
      },
      { 
        name: 'Invoice Analytics', 
        href: '/dashboard/admin/invoices/analytics', 
        icon: BarChart3,
        description: 'Invoice statistics'
      },
      { 
        name: 'Payment Reports', 
        href: '/dashboard/admin/invoices/reports', 
        icon: Receipt,
        description: 'Payment reports'
      }
    )
  }

  return invoiceSubNav
}
