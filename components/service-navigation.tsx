'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MessageSquare, 
  Phone, 
  Mail, 
  Globe,
  Star,
  MapPin,
  Clock,
  Package
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ServiceNavigationProps {
  serviceTitle?: string
  serviceId?: string
  providerName?: string
  providerId?: string
  showBackButton?: boolean
  showActions?: boolean
  showProviderInfo?: boolean
}

export default function ServiceNavigation({
  serviceTitle,
  serviceId,
  providerName,
  providerId,
  showBackButton = true,
  showActions = true,
  showProviderInfo = false
}: ServiceNavigationProps) {
  const router = useRouter()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: serviceTitle || 'Service',
        url: window.location.href
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      // You could add a toast notification here
    }
  }

  const handleSave = () => {
    // Implement save functionality
    // You could add a toast notification here
  }

  return (
    <div className="bg-white border-b sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Back Button and Service Info */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {serviceTitle && (
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
                  {serviceTitle}
                </h1>
                {providerName && (
                  <p className="text-sm text-gray-500">by {providerName}</p>
                )}
              </div>
            )}
          </div>

          {/* Center - Provider Info (if enabled) */}
          {showProviderInfo && providerId && (
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>4.8 (24 reviews)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>2 hours response</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-green-500" />
                <span>Muscat, Oman</span>
              </div>
            </div>
          )}

          {/* Right Side - Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              {providerId && (
                <>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
