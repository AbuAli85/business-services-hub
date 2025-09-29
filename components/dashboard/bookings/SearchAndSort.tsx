'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

export interface SearchAndSortProps {
  search: string
  onSearch: (q: string) => void
  sortBy: string
  onSortBy: (k: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrder: (o: 'asc' | 'desc') => void
}

export function SearchAndSort({ search, onSearch, sortBy, onSortBy, sortOrder, onSortOrder }: SearchAndSortProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e)=> onSearch(e.target.value)} placeholder="Search bookings..." className="pl-9" />
      </div>
      <Select value={sortBy} onValueChange={onSortBy}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lastUpdated">Last Updated</SelectItem>
          <SelectItem value="createdAt">Date Created</SelectItem>
          <SelectItem value="totalAmount">Amount</SelectItem>
          <SelectItem value="serviceTitle">Service</SelectItem>
          <SelectItem value="clientName">Client</SelectItem>
          <SelectItem value="providerName">Provider</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOrder} onValueChange={(v)=> onSortOrder(v as 'asc' | 'desc')}>
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Order" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Asc</SelectItem>
          <SelectItem value="desc">Desc</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export default SearchAndSort


