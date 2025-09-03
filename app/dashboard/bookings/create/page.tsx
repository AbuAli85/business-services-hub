'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon,
  Clock,
  Package,
  User,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Star,
  Phone,
  Mail,
  Building,
  MessageSquare
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  provider: {
    id: string
    full_name: string
    company_name?: string
    email: string
    phone?: string
  }
  packages: ServicePackage[]
}

interface ServicePackage {
  id: string
  name: string
  description: string
  price: number
  delivery_days: number
  revisions: number
  features: string[]
}

interface BookingForm {
  service_id: string
  package_id: string
  scheduled_date: Date | undefined
  scheduled_time: string
  location: string
  notes: string
  special_requirements: string
  budget_range: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
}

export default function CreateBookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState<BookingForm>({
    service_id: '',
    package_id: '',
    scheduled_date: undefined,
    scheduled_time: '',
    location: '',
    notes: '',
    special_requirements: '',
    budget_range: '',
    urgency: 'medium'
  })

  useEffect(() => {
    checkUserAndFetchServices()
  }, [])

  const checkUserAndFetchServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      await fetchServices()
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          *,
          packages:service_packages (*)
        `)
        .eq('status', 'active')
        .eq('approval_status', 'approved')

      if (error) throw error

      // Fetch provider information separately to avoid complex joins
      const enrichedServices = await Promise.all(
        (services || []).map(async (service) => {
          try {
            const { data: provider } = await supabase
              .from('profiles')
              .select('id, full_name, company_name, email, phone')
              .eq('id', service.provider_id)
              .single()
            
            return {
              ...service,
              provider: provider || { id: '', full_name: 'Unknown Provider', company_name: '', email: '', phone: '' }
            }
          } catch (error) {
            console.error('Error enriching service:', error)
            return {
              ...service,
              provider: { id: '', full_name: 'Unknown Provider', company_name: '', email: '', phone: '' }
            }
          }
        })
      )

      setServices(enrichedServices || [])

      // Preselect service from query parameter if available
      const serviceParam = searchParams?.get('service')
      if (serviceParam && (enrichedServices || []).length > 0) {
        const svc = (enrichedServices as any).find((s: Service) => s.id === serviceParam)
        if (svc) {
          setSelectedService(svc)
          setFormData(prev => ({ ...prev, service_id: svc.id }))
          const firstPkg = (svc.packages || [])[0]
          if (firstPkg) {
            setSelectedPackage(firstPkg)
            setFormData(prev => ({ ...prev, package_id: firstPkg.id }))
          } else {
            // For services without packages, clear package_id to indicate direct booking
            setFormData(prev => ({ ...prev, package_id: '' }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services')
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setFormData(prev => ({ ...prev, service_id: service.id }))
    setSelectedPackage(null)
    setFormData(prev => ({ ...prev, package_id: '' }))
  }

  const handlePackageSelect = (pkg: ServicePackage) => {
    setSelectedPackage(pkg)
    setFormData(prev => ({ ...prev, package_id: pkg.id }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedService || !formData.scheduled_date) {
      toast.error('Please fill in all required fields')
      return
    }

    // For services without packages, we'll create a direct booking
    if (!selectedPackage && (!selectedService.packages || selectedService.packages.length === 0)) {
      // This is a service without packages - we'll handle it differently
      console.log('Creating direct booking for service without packages')
    } else if (!selectedPackage) {
      toast.error('Please select a package')
      return
    }

    setSubmitting(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Prepare booking data based on whether service has packages or not
      const bookingData: any = {
        service_id: selectedService.id,
        provider_id: selectedService.provider.id,
        client_id: user.id,
        scheduled_date: formData.scheduled_date.toISOString(),
        scheduled_time: formData.scheduled_time,
        location: formData.location,
        notes: formData.notes,
        special_requirements: formData.special_requirements,
        budget_range: formData.budget_range,
        urgency: formData.urgency,
        status: 'pending',
        currency: selectedService.currency
      }

      // Add package-specific data if package exists
      if (selectedPackage) {
        bookingData.package_id = selectedPackage.id
        bookingData.amount = selectedPackage.price
      } else {
        // For services without packages, use base price and add a note
        bookingData.amount = selectedService.base_price
        bookingData.notes = (bookingData.notes || '') + '\n\n[Direct booking - no package selected. Provider will contact to discuss specific requirements and pricing.]'
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()

      if (error) throw error

      toast.success('Booking created successfully!')
      router.push(`/dashboard/bookings/${booking.id}`)
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error('Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    const config = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    }
    
    const urgencyConfig = config[urgency as keyof typeof config] || config.medium
    return <Badge className={urgencyConfig.color}>{urgencyConfig.label}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Booking</h1>
          <p className="text-gray-600 mt-1">Select a service and schedule your booking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Available Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Available Services</span>
              </CardTitle>
              <CardDescription>
                Choose from our available services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleServiceSelect(service)}
                  >
                    <div className="flex items-start space-x-4">
                      {service.cover_image_url && (
                        <img
                          src={service.cover_image_url}
                          alt={service.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {service.title}
                          </h3>
                          <Badge variant="outline">{service.category}</Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{service.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{service.provider.full_name}</span>
                            </div>
                            {service.provider.company_name && (
                              <div className="flex items-center space-x-1">
                                <Building className="h-4 w-4" />
                                <span>{service.provider.company_name}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(service.base_price, service.currency)}
                            </div>
                            <div className="text-sm text-gray-500">Starting from</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Package Selection */}
          {selectedService && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Service Packages</span>
                </CardTitle>
                <CardDescription>
                  {selectedService.packages && selectedService.packages.length > 0 
                    ? "Choose a package that fits your needs"
                    : "This service uses direct booking - no packages available"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedService.packages && selectedService.packages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedService.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedPackage?.id === pkg.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePackageSelect(pkg)}
                    >
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 mb-2">{pkg.name}</h4>
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {formatCurrency(pkg.price, selectedService.currency)}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery:</span>
                            <span className="font-medium">{pkg.delivery_days} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revisions:</span>
                            <span className="font-medium">{pkg.revisions}</span>
                          </div>
                        </div>
                        
                        {pkg.features.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-900 mb-2">Features:</h5>
                            <ul className="space-y-1">
                              {pkg.features.map((feature, index) => (
                                <li key={index} className="flex items-center space-x-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Direct Booking Available</h3>
                    <p className="text-gray-600 mb-4">
                      This service doesn't have predefined packages. You can book directly and the provider will contact you to discuss your specific requirements.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-blue-800 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Base Price: {formatCurrency(selectedService.base_price, selectedService.currency)}</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Final pricing will be determined based on your specific requirements and project scope.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Booking Form */}
          {selectedService && (selectedPackage || (!selectedService.packages || selectedService.packages.length === 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
                <CardDescription>
                  Fill in the details for your booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Date and Time Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Date
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.scheduled_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.scheduled_date ? format(formData.scheduled_date, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.scheduled_date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_date: date }))}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Time
                      </label>
                      <Select value={formData.scheduled_time} onValueChange={(value) => setFormData(prev => ({ ...prev, scheduled_time: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="13:00">1:00 PM</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="15:00">3:00 PM</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                          <SelectItem value="17:00">5:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location (Optional)
                    </label>
                    <Input
                      placeholder="Enter location or leave blank for remote service"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Notes
                    </label>
                    <Textarea
                      placeholder="Describe your project requirements, goals, and any specific details..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  {/* Special Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requirements
                    </label>
                    <Textarea
                      placeholder="Any special requirements, constraints, or preferences..."
                      value={formData.special_requirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  {/* Budget and Urgency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Range
                      </label>
                      <Select value={formData.budget_range} onValueChange={(value) => setFormData(prev => ({ ...prev, budget_range: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_500">Under {formatCurrency(500, selectedService.currency)}</SelectItem>
                          <SelectItem value="500_1000">{formatCurrency(500, selectedService.currency)} - {formatCurrency(1000, selectedService.currency)}</SelectItem>
                          <SelectItem value="1000_2500">{formatCurrency(1000, selectedService.currency)} - {formatCurrency(2500, selectedService.currency)}</SelectItem>
                          <SelectItem value="2500_5000">{formatCurrency(2500, selectedService.currency)} - {formatCurrency(5000, selectedService.currency)}</SelectItem>
                          <SelectItem value="over_5000">Over {formatCurrency(5000, selectedService.currency)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Urgency Level
                      </label>
                      <Select value={formData.urgency} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setFormData(prev => ({ ...prev, urgency: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Creating Booking...' : 'Create Booking'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Booking Summary */}
        <div className="space-y-6">
          {/* Selected Service Summary */}
          {selectedService && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedService.title}</h4>
                  <p className="text-sm text-gray-600">{selectedService.description}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{selectedService.provider.full_name}</span>
                  </div>
                  {selectedService.provider.company_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company:</span>
                      <span className="font-medium">{selectedService.provider.company_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{selectedService.category}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Package Summary */}
          {selectedPackage && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Package</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedPackage.name}</h4>
                  <p className="text-sm text-gray-600">{selectedPackage.description}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">{formatCurrency(selectedPackage.price, selectedService?.currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery:</span>
                    <span className="font-medium">{selectedPackage.delivery_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revisions:</span>
                    <span className="font-medium">{selectedPackage.revisions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Direct Booking Info for Services Without Packages */}
          {selectedService && !selectedPackage && (!selectedService.packages || selectedService.packages.length === 0) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Direct Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">This service uses direct booking</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">{formatCurrency(selectedService.base_price, selectedService.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Type:</span>
                    <span className="font-medium">Custom Quote</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 bg-blue-100 p-3 rounded-lg">
                  <strong>Note:</strong> The provider will contact you to discuss specific requirements and final pricing based on your needs.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider Contact Info */}
          {selectedService && (
            <Card>
              <CardHeader>
                <CardTitle>Provider Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{selectedService.provider.full_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{selectedService.provider.email}</span>
                </div>
                {selectedService.provider.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedService.provider.phone}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Provider
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Provide detailed project requirements for better results</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Set realistic timelines and expectations</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Communicate clearly with your provider</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Review the service agreement carefully</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
