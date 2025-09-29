'use client'

import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  Megaphone, 
  Briefcase, 
  Palette, 
  Code, 
  BarChart3,
  Smartphone,
  ShoppingCart,
  Search,
  PenTool
} from 'lucide-react'

export interface ServiceDisplayProps {
  title: string
  category?: string
  description?: string
  duration_minutes?: number
  price_cents?: number
  currency?: string
  compact?: boolean
  className?: string
}

function getCategoryConfig(category?: string) {
  switch (category?.toLowerCase()) {
    case 'web_development':
      return {
        label: 'Web Development',
        icon: Globe,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        bgColor: 'bg-blue-50'
      }
    
    case 'digital_marketing':
      return {
        label: 'Digital Marketing',
        icon: Megaphone,
        color: 'bg-green-100 text-green-800 border-green-200',
        bgColor: 'bg-green-50'
      }
    
    case 'business_consulting':
      return {
        label: 'Business Consulting',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        bgColor: 'bg-purple-50'
      }
    
    case 'design':
      return {
        label: 'Design',
        icon: Palette,
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        bgColor: 'bg-pink-50'
      }
    
    case 'mobile_development':
      return {
        label: 'Mobile Development',
        icon: Smartphone,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        bgColor: 'bg-indigo-50'
      }
    
    case 'ecommerce':
      return {
        label: 'E-commerce',
        icon: ShoppingCart,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        bgColor: 'bg-orange-50'
      }
    
    case 'seo':
      return {
        label: 'SEO',
        icon: Search,
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        bgColor: 'bg-teal-50'
      }
    
    case 'content_creation':
      return {
        label: 'Content Creation',
        icon: PenTool,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        bgColor: 'bg-yellow-50'
      }
    
    default:
      return {
        label: 'General Service',
        icon: BarChart3,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        bgColor: 'bg-gray-50'
      }
  }
}

function formatDuration(minutes?: number): string {
  if (!minutes) return ''
  
  if (minutes < 60) {
    return `${minutes}min`
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  } else { // Days
    const days = Math.floor(minutes / 1440)
    const remainingHours = Math.floor((minutes % 1440) / 60)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

function formatPrice(priceCents?: number, currency = 'OMR'): string {
  if (!priceCents || priceCents === 0) return ''
  
  const price = priceCents / 100
  return `${currency} ${price.toLocaleString('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  })}`
}

export function ServiceDisplay({ 
  title, 
  category, 
  description, 
  duration_minutes,
  price_cents,
  currency = 'OMR',
  compact = false,
  className = '' 
}: ServiceDisplayProps) {
  const categoryConfig = getCategoryConfig(category)
  const Icon = categoryConfig.icon
  
  // Clean up the title - remove generic "Service" if it's the only word
  const displayTitle = title === 'Service' ? 'Professional Service' : title
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`p-1.5 rounded-md ${categoryConfig.bgColor}`}>
          <Icon className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">
            {displayTitle}
          </p>
          {category && (
            <Badge 
              variant="outline" 
              className={`${categoryConfig.color} text-xs px-1.5 py-0.5 mt-0.5`}
            >
              {categoryConfig.label}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Service Title and Category */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${categoryConfig.bgColor} flex-shrink-0`}>
          <Icon className="h-5 w-5 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">
            {displayTitle}
          </h3>
          {category && (
            <Badge 
              variant="outline" 
              className={`${categoryConfig.color} text-xs mt-1`}
            >
              {categoryConfig.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      )}

      {/* Duration and Price */}
      {(duration_minutes || price_cents) && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {duration_minutes && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Duration:</span>
              <span>{formatDuration(duration_minutes)}</span>
            </div>
          )}
          {price_cents && price_cents > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Price:</span>
              <span className="font-semibold text-gray-900">
                {formatPrice(price_cents, currency)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ServiceTitle({ title, category, className = '' }: {
  title: string
  category?: string
  className?: string
}) {
  const categoryConfig = getCategoryConfig(category)
  const Icon = categoryConfig.icon
  const displayTitle = title === 'Service' ? 'Professional Service' : title
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
      <span className="font-medium text-gray-900 truncate">
        {displayTitle}
      </span>
    </div>
  )
}
