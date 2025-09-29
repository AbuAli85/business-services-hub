'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react'

export interface ColumnDef<T> {
  key: keyof T | string
  header: string | React.ReactNode
  widthClass?: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  className?: string
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    className,
    page = 1,
    pageSize = 10,
    total = data.length,
    onPageChange,
    onSortChange,
    sortKey,
    sortDirection,
    emptyMessage = 'No records found'
  } = props

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  const handleHeaderClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !onSortChange) return
    const key = String(col.key)
    let next: 'asc' | 'desc' = 'asc'
    if (sortKey === key) {
      next = sortDirection === 'asc' ? 'desc' : 'asc'
    }
    onSortChange(key, next)
  }

  return (
    <div className={cn('w-full border rounded-lg overflow-hidden', className)}>
      <div className="w-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map(col => (
                <th key={String(col.key)} className={cn('text-left font-medium px-4 py-2 whitespace-nowrap', col.widthClass)}>
                  <button
                    type="button"
                    className={cn('inline-flex items-center gap-1', col.sortable ? 'hover:underline' : '')}
                    onClick={() => handleHeaderClick(col)}
                  >
                    {col.header}
                    {col.sortable ? <ArrowUpDown className="h-3 w-3" /> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-slate-500 py-8">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t bg-white text-sm">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(1)} disabled={!canPrev}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(page - 1)} disabled={!canPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(page + 1)} disabled={!canNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(totalPages)} disabled={!canNext}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DataTable


