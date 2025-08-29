'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function TestReviewsPage() {
  const [formData, setFormData] = useState({
    booking_id: '',
    client_id: '',
    provider_id: '',
    rating: 5,
    comment: ''
  })
  const [loading, setLoading] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Review created successfully!')
        setFormData({
          booking_id: '',
          client_id: '',
          provider_id: '',
          rating: 5,
          comment: ''
        })
        fetchReviews()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to create review')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      const result = await response.json()
      
      if (response.ok) {
        setReviews(result.reviews || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Test Reviews System</h1>
        <p className="text-gray-600 mt-2">Add and test reviews functionality</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Review Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Review</CardTitle>
            <CardDescription>Create a test review to verify the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="booking_id">Booking ID (optional)</Label>
                <Input
                  id="booking_id"
                  value={formData.booking_id}
                  onChange={(e) => handleInputChange('booking_id', e.target.value)}
                  placeholder="Enter booking ID if available"
                />
              </div>

              <div>
                <Label htmlFor="client_id">Client ID *</Label>
                <Input
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  placeholder="Enter client user ID"
                  required
                />
              </div>

              <div>
                <Label htmlFor="provider_id">Provider ID *</Label>
                <Input
                  id="provider_id"
                  value={formData.provider_id}
                  onChange={(e) => handleInputChange('provider_id', e.target.value)}
                  placeholder="Enter provider user ID"
                  required
                />
              </div>

              <div>
                <Label htmlFor="rating">Rating *</Label>
                <Select
                  value={formData.rating.toString()}
                  onValueChange={(value) => handleInputChange('rating', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Good</SelectItem>
                    <SelectItem value="4">4 - Very Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Enter your review comment"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Review'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* View Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Reviews</CardTitle>
            <CardDescription>View all reviews in the system</CardDescription>
            <Button onClick={fetchReviews} variant="outline" size="sm">
              Refresh Reviews
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Rating: {review.rating}/5</div>
                        {review.comment && (
                          <div className="text-sm text-gray-600 mt-1">{review.comment}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      <div>Client: {review.client_id}</div>
                      <div>Provider: {review.provider_id}</div>
                      {review.booking_id && <div>Booking: {review.booking_id}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Test Data */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Data</CardTitle>
          <CardDescription>Use these IDs for testing (replace with actual IDs from your system)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Sample Client IDs:</h4>
              <div className="space-y-1 text-gray-600">
                <div>• d2ce1fe9-806f-4dbc-8efb-9cf160f19e4b (your current user)</div>
                <div>• Create a new client account to get another ID</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sample Provider IDs:</h4>
              <div className="space-y-1 text-gray-600">
                <div>• d2ce1fe9-806f-4dbc-8efb-9cf160f19e4b (your current user)</div>
                <div>• Use your own ID to test provider reviews</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
