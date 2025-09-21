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
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

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
    const imageMap: { [key: string]: string } = {
      'Digital Marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
      'Legal Services': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=225&fit=crop',
      'Accounting': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
      'IT Services': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop',
      'Design & Branding': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=225&fit=crop',
      'Consulting': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop',
      'Translation': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=225&fit=crop',
      'HR Services': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=225&fit=crop',
      'Web Development': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop',
      'Content Creation': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop'
    }
    return imageMap[category] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop'
  }

  useEffect(() => {
    fetchServices()
  }, [searchQuery, selectedCategory, minPrice, maxPrice, sortBy])

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

      // Apply sorting
      filtered = sortServices(filtered, sortBy)

      setServices(filtered)
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
        return sorted.sort((a, b) => (b as any).rating - (a as any).rating)
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      case 'popular':
        return sorted.sort((a, b) => (b as any).popularity - (a as any).popularity)
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
          <h1 className="text-3xl font-bold text-gray-900">Business Services</h1>
          <p className="mt-2 text-gray-600">
            Find trusted service providers for all your business needs
          </p>
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
                {services.length} services found
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
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={getServiceImage(service.category, service.title)}
                      alt={`${service.title} - ${service.category} service`}
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
