'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Download, Bell, Archive, FileText, CheckSquare } from 'lucide-react'

export interface BulkActionsProps {
  selectedCount: number
  onClear: () => void
  onExport?: (format: 'csv' | 'pdf') => void
  onUpdateStatus?: (status: string) => void
  onNotify?: () => void
  onReport?: () => void
  onArchive?: () => void
}

export function BulkActions({ selectedCount, onClear, onExport, onUpdateStatus, onNotify, onReport, onArchive }: BulkActionsProps) {
  if (selectedCount === 0) return null
  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border rounded-lg p-3 flex flex-wrap items-center gap-2">
      <div className="font-medium mr-2"><CheckSquare className="inline h-4 w-4 mr-1" /> {selectedCount} selected</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onExport?.('csv')}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        <Button size="sm" variant="outline" onClick={() => onExport?.('pdf')}><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
        <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.('confirmed')}><CheckSquare className="h-4 w-4 mr-1" /> Mark Confirmed</Button>
        <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.('in_progress')}><CheckSquare className="h-4 w-4 mr-1" /> Mark In Progress</Button>
        <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.('completed')}><CheckSquare className="h-4 w-4 mr-1" /> Mark Completed</Button>
        <Button size="sm" variant="outline" onClick={() => onNotify?.()}><Bell className="h-4 w-4 mr-1" /> Notify</Button>
        <Button size="sm" variant="outline" onClick={() => onReport?.()}><FileText className="h-4 w-4 mr-1" /> Report</Button>
        <Button size="sm" variant="outline" onClick={() => onArchive?.()}><Archive className="h-4 w-4 mr-1" /> Archive</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
      </div>
    </div>
  )
}

export default BulkActions


