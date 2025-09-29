export function calculateExperienceYears(createdAtIso?: string | null, fallbackYears?: number): number {
  try {
    if (typeof fallbackYears === 'number' && fallbackYears > 0) return Math.floor(fallbackYears)
    if (!createdAtIso) return 0
    const created = new Date(createdAtIso).getTime()
    if (isNaN(created)) return 0
    const diffMs = Date.now() - created
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25)
    return Math.max(0, Math.floor(years))
  } catch {
    return 0
  }
}

export interface CompletionInputs {
  completed: number
  total: number
}

export function calculateCompletionRate({ completed, total }: CompletionInputs): number {
  if (!total || total <= 0) return 0
  const pct = Math.round((completed / total) * 100)
  return Math.min(100, Math.max(0, pct))
}

export function formatCompletionLabel(completed: number, total: number): string {
  const rate = calculateCompletionRate({ completed, total })
  return `Project Completion Rate: ${rate}%`
}

export function formatSatisfactionLabel(score?: number | null, scaleMax: number = 5): string {
  if (typeof score === 'number' && score > 0) {
    const clamped = Math.min(scaleMax, Math.max(0, score))
    return `Client Satisfaction: ${clamped}/${scaleMax}`
  }
  return 'Client Satisfaction: N/A'
}


