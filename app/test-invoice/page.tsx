'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  status: string
  approval_status: string
  amount: number
  currency: string
  created_at: string
  service: { title: string }
  client: { full_name: string }
  provider: { full_name: string }
  has_invoice: boolean
  invoice?: {
    id: string
    invoice_number: string
    status: string
  }
}

export default function TestInvoicePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState('')

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-invoice-generation')
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      setBookings(data.bookings || [])
      toast.success(`Found ${data.summary.total_approved} approved bookings`)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast.error('Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const testInvoiceGeneration = async (bookingId: string) => {
    try {
      setTesting(true)
      const response = await fetch('/api/test-invoice-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Invoice generated successfully!')
        // Refresh the bookings list
        await fetchBookings()
      } else {
        toast.error(data.error || 'Failed to generate invoice')
      }
    } catch (error) {
      console.error('Error testing invoice generation:', error)
      toast.error('Failed to test invoice generation')
    } finally {
      setTesting(false)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    if (booking.has_invoice) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Has Invoice
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          No Invoice
        </Badge>
      )
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Generation Test</h1>
          <p className="text-gray-600 mt-2">
            Test the automatic invoice generation system for approved bookings
          </p>
        </div>
        <Button onClick={fetchBookings} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Bookings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Approved Bookings
          </CardTitle>
          <CardDescription>
            These bookings should automatically generate invoices when approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No approved bookings found</p>
              <Button onClick={fetchBookings} className="mt-4">
                Load Bookings
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {booking.service?.title || 'Service'}
                        </h3>
                        {getStatusBadge(booking)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span> {booking.client?.full_name}
                        </div>
                        <div>
                          <span className="font-medium">Provider:</span> {booking.provider?.full_name}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> {booking.currency} {booking.amount}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {booking.status}
                        </div>
                        <div>
                          <span className="font-medium">Approval:</span> {booking.approval_status}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(booking.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {booking.invoice && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Invoice Details:</span>
                          </div>
                          <div className="text-sm text-green-700 mt-1">
                            <div>Invoice #: {booking.invoice.invoice_number}</div>
                            <div>Status: {booking.invoice.status}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {!booking.has_invoice && (
                        <Button
                          onClick={() => testInvoiceGeneration(booking.id)}
                          disabled={testing}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {testing ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Test</CardTitle>
          <CardDescription>
            Test invoice generation for a specific booking ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter booking ID"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => testInvoiceGeneration(selectedBookingId)}
              disabled={!selectedBookingId || testing}
            >
              Test Generation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}