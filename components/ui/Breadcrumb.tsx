import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const router = useRouter()

  const handleNavigation = (href?: string) => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      {/* Home icon */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleNavigation('/dashboard')}
        className="p-1 h-auto text-gray-600 hover:text-gray-900"
      >
        <Home className="h-4 w-4" />
      </Button>
      
      {/* Breadcrumb items */}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {item.href ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item.href)}
              className="p-0 h-auto text-gray-600 hover:text-gray-900 font-normal"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </Button>
          ) : (
            <span className="text-gray-900 font-medium">
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
