'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// We now fetch from our API which already enriches services with provider and packages
import { formatCurrency } from '@/lib/utils'
import { Search, Filter, Star, MapPin, Building2, Eye } from 'lucide-react'

interface Service {
  id: string
  title: string  // Using the correct column name
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  provider?: {
    id?: string
    full_name?: string
    email?: string
    phone?: string
    company_name?: string
    avatar_url?: string
  } | null
  service_packages: Array<{
    id: string
    name: string
    price: number
    delivery_days: number
  }>
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const categories = [
    'Digital Marketing',
    'Legal Services',
    'Accounting',
    'IT Services',
    'Design & Branding',
    'Consulting',
    'Translation',
    'HR Services',
    'Web Development',
    'Content Creation'
  ]

  useEffect(() => {
    fetchServices()
  }, [searchQuery, selectedCategory, minPrice, maxPrice])

  const fetchServices = async () => {
    setLoading(true)
    
    try {
      // Build API query params
      const params = new URLSearchParams()
      params.set('status', 'active')
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)
      // Basic pagination (optional): fetch first 50
      params.set('limit', '50')
      params.set('page', '1')

      const res = await fetch(`/api/services?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('Error fetching services via API:', await res.text())
        setServices([])
        return
      }
      const { services: servicesData } = await res.json()

      // Client-side price range filtering if provided
      let filtered = servicesData || []
      if (minPrice) {
        const min = parseFloat(minPrice)
        filtered = filtered.filter((s: any) => (s.base_price ?? 0) >= min)
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice)
        filtered = filtered.filter((s: any) => (s.base_price ?? 0) <= max)
      }

      setServices(filtered)
      
      // If no services found, add a test service to verify the UI works
      if (transformedServices.length === 0) {
        console.log('No services found in database, adding test service')
        const testService: Service = {
          id: 'test-1',
          title: 'Test Service',
          description: 'This is a test service to verify the UI is working correctly.',
          category: 'IT Services',
          base_price: 100,
          currency: 'OMR',
          provider: { full_name: 'Test Provider' },
          service_packages: []
        }
        setServices([testService])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setMinPrice('')
    setMaxPrice('')
  }

  const getLowestPrice = (packages: Service['service_packages'], basePrice: number = 0) => {
    if (!packages || packages.length === 0) return basePrice
    return Math.min(...packages.map(pkg => pkg.price))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Services</h1>
          <p className="mt-2 text-gray-600">
            Find trusted service providers for all your business needs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="Min Price (OMR)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            
            <Input
              type="number"
              placeholder="Max Price (OMR)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {services.length} services found
              </span>
            </div>
            
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No services found matching your criteria.</p>
            <Button onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  {service.cover_image_url ? (
                    <img
                      src={service.cover_image_url}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <Building2 className="h-12 w-12 text-gray-500" />
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{service.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="secondary">{service.category}</Badge>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>4.5</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>Oman</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      From {formatCurrency(getLowestPrice(service.service_packages, service.base_price), service.currency)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      by <span className="font-medium">{service.provider?.full_name || 'Service Provider'}</span>
                      {service.provider?.company_name && (
                        <span className="block text-xs text-gray-500">
                          {service.provider.company_name}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/services/${service.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
