import { addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { daysUntil, formatCardDate, relativeDays } from '@/lib/credit-cards'

// Used when TrueLayer does not report an expiry; UK bank consents typically last 90 days.
const ASSUMED_CONSENT_DAYS = 90

export default function ConnectionExpiry({ connectedAt, expiresAt, className }: {
  connectedAt: string
  expiresAt?: string | null
  className?: string
}) {
  const connected = new Date(connectedAt)
  const expiry = expiresAt ? new Date(expiresAt) : addDays(connected, ASSUMED_CONSENT_DAYS)
  const days = daysUntil(expiry)
  const tone = days <= 7 ? 'text-red-600 font-semibold' : days <= 21 ? 'text-amber-700 font-semibold' : 'text-slate-500'

  return (
    <div className={cn('flex items-baseline justify-between gap-3 text-xs', className)}>
      <span className="text-slate-500">Connected {formatCardDate(connected)}</span>
      <span
        className={cn('text-right tabular-nums', tone)}
        title={expiresAt ? 'Reported by TrueLayer' : `Estimated: ${ASSUMED_CONSENT_DAYS} days after connecting`}
      >
        {days < 0 ? 'Expired' : 'Expires'} {expiresAt ? '' : '~'}{formatCardDate(expiry, false)} · {relativeDays(expiry)}
      </span>
    </div>
  )
}
