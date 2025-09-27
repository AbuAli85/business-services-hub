// Timezone utilities (Asia/Muscat)
export const fmtDateTimeOM = (d: string | Date) =>
  new Intl.DateTimeFormat('en-OM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  }).format(new Date(d))

export const formatLocalDate = (dateString: string) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { 
    timeZone: 'Asia/Muscat', 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit' 
  }).format(date)
}

export const formatLocalTime = (dateString: string) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { 
    timeZone: 'Asia/Muscat', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }).format(date) + ' GST'
}
