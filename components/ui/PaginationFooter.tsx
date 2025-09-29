'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationFooterProps {
  page: number
  totalPages: number
  totalCount: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
  onGoTo: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSize?: number
}

export function PaginationFooter({ page, totalPages, totalCount, pageCount, onPrev, onNext, onGoTo, onPageSizeChange, pageSize }: PaginationFooterProps) {
  const windowPages = (() => {
    const radius = 2
    const start = Math.max(1, page - radius)
    const end = Math.min(totalPages, page + radius)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })()
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4" aria-label="Pagination Navigation">
      <div className="text-sm text-gray-600" aria-live="polite">
        Page {page} of {totalPages} • {totalCount} total results
        <span className="text-blue-600 ml-2">(Showing {pageCount} on this page)</span>
      </div>
      <div className="flex items-center gap-2" role="navigation" aria-label="Pages">
        <div className="flex items-center gap-2 mr-2">
          <label className="text-sm text-gray-600" htmlFor="per-page">Per page:</label>
          <select id="per-page" title="Items per page" className="border rounded px-2 py-1 text-sm" value={pageSize ?? 10} onChange={(e)=> onPageSizeChange?.(parseInt(e.target.value,10))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <label className="text-sm text-gray-600 ml-2" htmlFor="jump-page">Jump to:</label>
          <input id="jump-page" title="Jump to page" placeholder="Page" type="number" min={1} max={totalPages} className="w-16 border rounded px-2 py-1 text-sm" onKeyDown={(e)=> { if (e.key==='Enter') { const v = parseInt((e.target as HTMLInputElement).value||'1',10); if (!Number.isNaN(v)) onGoTo(Math.min(Math.max(1, v), totalPages)) } }} />
        </div>
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 1} aria-label="Previous Page">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {windowPages.map((p) => (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGoTo(p)}
              className="w-8 h-8 p-0"
              aria-current={page === p ? 'page' : undefined}
              aria-label={`Go to page ${p}`}
            >
              {p}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page === totalPages} aria-label="Next Page">
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default PaginationFooter


