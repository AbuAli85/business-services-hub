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
import { getServiceCardImageUrl } from '@/lib/service-images'
import { Search, Filter, Star, MapPin, Building2, Eye } from 'lucide-react'

interface Service {
  id: string
  title: string  // Using the correct column name
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  created_at?: string
  rating?: number
  popularity?: number
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
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const PAGE_LIMIT = 12

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

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest First' },
    { value: 'popular', label: 'Most Popular' }
  ]

  // Service images mapping for better visual representation
  const getServiceImage = (category: string, title: string) => {
    return getServiceCardImageUrl(category, title, undefined, 400, 225)
  }

  useEffect(() => {
    fetchServices()
  }, [searchQuery, selectedCategory, minPrice, maxPrice, sortBy, page])

  const fetchServices = async () => {
    setLoading(true)
    
    try {
      // Build API query params
      const params = new URLSearchParams()
      params.set('status', 'active')
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)
      // Server-side pagination
      params.set('limit', String(PAGE_LIMIT))
      params.set('page', String(page))

      const res = await fetch(`/api/services?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('Error fetching services via API:', await res.text())
        setServices([])
        return
      }
      const { services: servicesData, pagination } = await res.json()

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

      // Apply sorting
      filtered = sortServices(filtered, sortBy)

      setServices(filtered)
      if (pagination) {
        setTotalPages(pagination.pages || 1)
        setTotalResults(pagination.total || filtered.length)
      } else {
        setTotalPages(1)
        setTotalResults(filtered.length)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortServices = (services: Service[], sortBy: string) => {
    const sorted = [...services]
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => getLowestPrice(a.service_packages, a.base_price) - getLowestPrice(b.service_packages, b.base_price))
      case 'price-high':
        return sorted.sort((a, b) => getLowestPrice(b.service_packages, b.base_price) - getLowestPrice(a.service_packages, a.base_price))
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
      case 'popular':
        return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      default:
        return sorted
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('relevance')
  }

  const getLowestPrice = (packages: Service['service_packages'], basePrice: number = 0) => {
    if (!packages || packages.length === 0) return basePrice
    return Math.min(...packages.map(pkg => pkg.price))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Services</h1>
              <p className="mt-2 text-gray-600">
                Find trusted service providers for all your business needs
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
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
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (OMR)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min Price"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max Price"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {services.length} services shown • Page {page} of {totalPages}
              </span>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing results for {selectedCategory === 'all' ? 'all categories' : selectedCategory}
            </div>
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
                      alt={`${service.title} - ${service.category} service`}
                      loading="lazy"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={getServiceImage(service.category, service.title)}
                      alt={`${service.title} - ${service.category} service`}
                      loading="lazy"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
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
                    {typeof service.rating === 'number' && service.rating > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{service.rating.toFixed(1)}</span>
                      </div>
                    )}
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

        {/* Pagination Controls */}
        {!loading && services.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, totalResults)} of {totalResults}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
