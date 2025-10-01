export const formatMuscat = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Muscat',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(iso))
    : '—'


