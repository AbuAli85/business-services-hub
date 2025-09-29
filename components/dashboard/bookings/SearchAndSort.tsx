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
  const [open, setOpen] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [recent, setRecent] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('bookings:recentSearches') || '[]') } catch { return [] }
  })

  const handleChange = (v: string) => {
    onSearch(v)
    setOpen(Boolean(v))
    // very lightweight suggestions demo
    const ops = ['status:pending', 'client:', 'provider:', 'amount:>500', 'tag:urgent']
    setSuggestions(ops.filter(o => o.includes(v) || v.includes(':')))
  }

  const commitSearch = (q: string) => {
    onSearch(q)
    setOpen(false)
    if (!q) return
    const next = [q, ...recent.filter(r => r !== q)].slice(0, 5)
    setRecent(next)
    try { localStorage.setItem('bookings:recentSearches', JSON.stringify(next)) } catch {}
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e)=> handleChange(e.target.value)} onKeyDown={(e)=> { if (e.key === 'Enter') commitSearch(search) }} placeholder="Search bookings, clients, providers, services..." className="pl-9" />
        {open && (suggestions.length > 0 || recent.length > 0) && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-sm text-sm">
            {suggestions.length > 0 && (
              <div className="p-2 border-b">
                <div className="text-xs text-muted-foreground mb-1">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button key={s} className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded border" onClick={()=> commitSearch(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {recent.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-1">Recent</div>
                <div className="flex flex-wrap gap-2">
                  {recent.map(r => (
                    <button key={r} className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded border" onClick={()=> commitSearch(r)}>{r}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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


