import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MessageSquare, Star, Clock, Building, MapPin } from 'lucide-react'
import { BookingDetails } from '@/hooks/useBookingDetails'

interface BookingDetailsParticipantsProps {
  booking: BookingDetails
  userRole: 'client' | 'provider' | 'admin'
}

export function BookingDetailsParticipants({ booking, userRole }: BookingDetailsParticipantsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={booking.client.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(booking.client.full_name)}
              </AvatarFallback>
            </Avatar>
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={booking.client.avatar_url} />
              <AvatarFallback className="text-lg">
                {getInitials(booking.client.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{booking.client.full_name}</h3>
                {booking.client.company_name && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {booking.client.company_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{booking.client.email}</span>
                  </div>
                  
                  {booking.client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{booking.client.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Response time: {booking.client.response_time}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Timezone: {booking.client.timezone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Preferred: {booking.client.preferred_contact}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={booking.provider.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(booking.provider.full_name)}
              </AvatarFallback>
            </Avatar>
            Provider Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={booking.provider.avatar_url} />
              <AvatarFallback className="text-lg">
                {getInitials(booking.provider.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{booking.provider.full_name}</h3>
                {booking.provider.company_name && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {booking.provider.company_name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {booking.provider.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{booking.provider.rating}</span>
                    <span className="text-sm text-gray-500">
                      ({booking.provider.total_reviews} reviews)
                    </span>
                  </div>
                )}
                
                {booking.provider.availability_status && (
                  <Badge className={getAvailabilityColor(booking.provider.availability_status)}>
                    {booking.provider.availability_status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{booking.provider.email}</span>
                  </div>
                  
                  {booking.provider.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{booking.provider.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Response time: {booking.provider.response_time}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {booking.provider.specialization && booking.provider.specialization.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Specializations</p>
                      <div className="flex flex-wrap gap-1">
                        {booking.provider.specialization.map((spec, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
