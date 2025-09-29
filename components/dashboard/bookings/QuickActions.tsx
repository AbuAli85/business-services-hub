'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Mail, FileDown, FileText, Settings2, StickyNote, Calendar } from 'lucide-react'

export interface QuickActionsProps {
  bookingId: string
  onAction: (action: string, bookingId: string) => void
}

export function QuickActions({ bookingId, onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={()=> onAction('view_details', bookingId)}><Settings2 className="h-4 w-4 mr-1" /> Details</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('contact_client', bookingId)}><MessageSquare className="h-4 w-4 mr-1" /> Client</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('contact_provider', bookingId)}><Mail className="h-4 w-4 mr-1" /> Provider</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('download_invoice', bookingId)}><FileDown className="h-4 w-4 mr-1" /> Invoice</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('download_contract', bookingId)}><FileText className="h-4 w-4 mr-1" /> Contract</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('add_note', bookingId)}><StickyNote className="h-4 w-4 mr-1" /> Note</Button>
      <Button size="sm" variant="outline" onClick={()=> onAction('schedule_meeting', bookingId)}><Calendar className="h-4 w-4 mr-1" /> Meeting</Button>
    </div>
  )
}

export default QuickActions


