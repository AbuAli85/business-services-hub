'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  Wallet, 
  Star,
  MoreVertical
} from 'lucide-react'

interface ServiceCardProps {
  service: {
    id: string
    title: string
    description: string
    category: string
    base_price: number
    currency: string
    cover_image_url?: string
    status: string
    rating?: number
    total_bookings?: number
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onView?: (id: string) => void
  onBook?: (id: string) => void
}

export default function EnhancedServiceCard({
  service,
  onEdit,
  onDelete,
  onView,
  onBook
}: ServiceCardProps) {
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800'
    ]
    const index = category.length % colors.length
    return colors[index]
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100">
        {service.cover_image_url ? (
          <Image
            src={service.cover_image_url}
            alt={service?.title || 'Service'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl text-blue-400">📋</div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={getStatusColor(service.status)}>
            {service.status}
          </Badge>
        </div>

        {/* Action Menu */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
              {onView && (
                <button
                  onClick={() => onView(service.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(service.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(service.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
              {service?.title || 'Service'}
            </CardTitle>
            <CardDescription className="mt-2 text-gray-600 line-clamp-2">
              {service.description}
            </CardDescription>
          </div>
        </div>
        
        {/* Category and Rating */}
        <div className="flex items-center justify-between mt-3">
          <Badge className={getCategoryColor(service.category)}>
            {service.category}
          </Badge>
          {service.rating && (
            <div className="flex items-center text-sm text-gray-600">
              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
              {service.rating.toFixed(1)}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Wallet className="h-4 w-4 mr-2 text-green-600" />
            <span className="font-medium">
              {service.base_price} {service.currency || 'OMR'}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-blue-600" />
            <span className="font-medium">
              {service.total_bookings || 0} bookings
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {onBook && (
            <Button 
              className="flex-1" 
              onClick={() => onBook(service.id)}
            >
              Book Now
            </Button>
          )}
          {onView && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onView(service.id)}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
