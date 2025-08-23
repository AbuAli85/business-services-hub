'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Search, Filter, Star, MapPin, Building2, Eye } from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  provider: {
    full_name: string
    company?: {
      name: string
    }
  }
  service_packages: Array<{
    id: string
    name: string
    price: number
    delivery_days: number
  }>
}

export default function DashboardServicesPage() {
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
      // Simple query first - just get services without relationships
      let query = supabase
        .from('services')
        .select('*')

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      if (minPrice) {
        query = query.gte('base_price', parseFloat(minPrice))
      }

      if (maxPrice) {
        query = query.lte('base_price', parseFloat(maxPrice))
      }

      const { data: servicesData, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching services:', error)
        return
      }

      // Log what we actually got from the database
      console.log('Raw services data:', servicesData)
      
      // Transform the data to match our interface
      const transformedServices = (servicesData || []).map(service => ({
        ...service,
        provider: {
          full_name: 'Service Provider' // Default provider name
        },
        service_packages: [] // Empty packages for now
      }))

      setServices(transformedServices)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchServices()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setMinPrice('')
    setMaxPrice('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Services</h1>
          <p className="text-gray-600">Discover and book professional services</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Services Grid */}
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedCategory !== 'all' || minPrice || maxPrice
                  ? 'Try adjusting your search criteria'
                  : 'No services are currently available'
                }
              </p>
              {(searchQuery || selectedCategory !== 'all' || minPrice || maxPrice) && (
                <Button onClick={clearFilters} variant="outline">
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{service.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mb-3">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{service.category}</Badge>
                    <Badge variant="outline">
                      {formatCurrency(service.base_price, service.currency)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>{service.provider.full_name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Button size="sm" variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      
                      <Button size="sm">
                        Book Now
                      </Button>
                    </div>
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
