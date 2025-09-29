export const muscatTz = 'Asia/Muscat'

export function formatMonthYear(d: Date = new Date()): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: muscatTz })
}


