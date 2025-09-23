import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { Search, Filter, Star, MapPin, Eye } from 'lucide-react'

export const revalidate = 300

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  created_at?: string
  rating?: number
  provider?: { id?: string; full_name?: string; company_name?: string } | null
  service_packages: Array<{ id: string; name: string; price: number; delivery_days: number }>
}

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

function getServiceImage(category: string, title: string) {
  return getServiceCardImageUrl(category, title, undefined, 400, 225)
}

async function fetchServicesSSR(params: { category?: string; search?: string; page?: number }) {
  const query = new URLSearchParams()
  query.set('status', 'active')
  query.set('limit', String(PAGE_LIMIT))
  query.set('page', String(params.page || 1))
  if (params.category && params.category !== 'all') query.set('category', params.category)
  if (params.search) query.set('search', params.search)

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/services?${query.toString()}`, {
    // Use ISR; let upstream API be cached by Next
    next: { revalidate }
  })
  if (!res.ok) return { services: [], pagination: { page: 1, pages: 1, total: 0 } }
  return res.json()
}

export default async function ServicesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const page = Number(searchParams.page || 1)
  const selectedCategory = typeof searchParams.category === 'string' ? searchParams.category : 'all'
  const searchQuery = typeof searchParams.search === 'string' ? searchParams.search : ''

  const { services, pagination }: { services: Service[]; pagination: { page: number; pages: number; total: number } } = await fetchServicesSSR({
    category: selectedCategory,
    search: searchQuery,
    page
  })

  const totalPages = pagination?.pages || 1
  const totalResults = pagination?.total || services.length

  return (
    <div className="min-h-screen bg-gray-50">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Services</h1>
              <p className="mt-2 text-gray-600">Find trusted service providers for all your business needs</p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form className="flex flex-col lg:flex-row gap-4 mb-4" method="get">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input name="search" defaultValue={searchQuery} placeholder="Search services..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select name="category" defaultValue={selectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="page" value="1" />
              <Button type="submit" variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Link href="/services">
                <Button type="button" variant="outline">Clear</Button>
              </Link>
            </div>
          </form>

          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{services.length} services shown • Page {page} of {totalPages}</span>
            </div>
            <div className="text-sm text-gray-500">Showing results for {selectedCategory === 'all' ? 'all categories' : selectedCategory}</div>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No services found matching your criteria.</p>
            <Link href="/services">
              <Button className="mt-4">Clear Filters</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  {service.cover_image_url ? (
                    <img src={service.cover_image_url} alt={`${service.title} - ${service.category} service`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <img src={getServiceImage(service.category, service.title)} alt={`${service.title} - ${service.category} service`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  )}
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{service.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">{service.description}</CardDescription>
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
                    <span className="text-lg font-semibold text-blue-600">From {formatCurrency(getLowestPrice(service.service_packages, service.base_price), service.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      by <span className="font-medium">{service.provider?.full_name || 'Service Provider'}</span>
                      {service.provider?.company_name && <span className="block text-xs text-gray-500">{service.provider.company_name}</span>}
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

        {services.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-600">Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, totalResults)} of {totalResults}</div>
            <div className="flex gap-2">
              <Button variant="outline" asChild disabled={page <= 1}>
                <Link href={{ pathname: '/services', query: { search: searchQuery || undefined, category: selectedCategory !== 'all' ? selectedCategory : undefined, page: Math.max(1, page - 1) } }}>Previous</Link>
              </Button>
              <Button variant="outline" asChild disabled={page >= totalPages}>
                <Link href={{ pathname: '/services', query: { search: searchQuery || undefined, category: selectedCategory !== 'all' ? selectedCategory : undefined, page: Math.min(totalPages, page + 1) } }}>Next</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getLowestPrice(packages: Service['service_packages'], basePrice: number = 0) {
  if (!packages || packages.length === 0) return basePrice
  return Math.min(...packages.map((pkg) => pkg.price))
}
