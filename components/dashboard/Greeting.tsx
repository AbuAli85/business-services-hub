import { formatMonthYear } from '@/lib/datetime'

export function Greeting({ firstName }: { firstName?: string | null }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">Welcome{firstName ? `, ${firstName}` : ''}</h1>
      <p className="text-sm text-muted-foreground">Here’s your business overview for {formatMonthYear()}.</p>
    </div>
  )
}

export default Greeting


