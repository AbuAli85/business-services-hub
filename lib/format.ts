import { muscatTz } from '@/lib/datetime'

export function formatOMR(value: number): string {
  const num = Number(value) || 0
  return `OMR ${num.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
}

export function formatMuscatDateTime(iso?: string | number | Date | null): string {
  if (!iso) return '—'
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { timeZone: muscatTz })
}

export function formatMuscatDate(iso?: string | number | Date | null): string {
  if (!iso) return '—'
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { timeZone: muscatTz })
}


