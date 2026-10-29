import { cn } from '@/lib/utils'
import {
  type CreditCardDates,
  daysUntil,
  formatCardDate,
  nextMonthlyDate,
  parseDateOnly,
  relativeDays,
} from '@/lib/credit-cards'

type Tone = 'danger' | 'warn' | 'neutral'

export const toneClass: Record<Tone, string> = {
  danger: 'text-red-600',
  warn: 'text-amber-700',
  neutral: 'text-slate-500',
}

export interface ScheduleItem {
  value: string
  detail: string
  tone: Tone
}

export function getCardSchedule(card: CreditCardDates, today = new Date()) {
  const { promoEndDate, statementDay, paymentDueDay } = card

  let promo: ScheduleItem | null = null
  if (promoEndDate) {
    const end = parseDateOnly(promoEndDate)
    const days = daysUntil(end, today)
    promo = {
      value: formatCardDate(end),
      detail: days < 0 ? 'ended' : relativeDays(end, today),
      tone: days <= 30 ? 'danger' : days <= 90 ? 'warn' : 'neutral',
    }
  }

  let statement: ScheduleItem | null = null
  if (statementDay) {
    const next = nextMonthlyDate(statementDay, today)
    statement = { value: formatCardDate(next, false), detail: relativeDays(next, today), tone: 'neutral' }
  }

  let due: ScheduleItem | null = null
  if (paymentDueDay) {
    const next = nextMonthlyDate(paymentDueDay, today)
    const days = daysUntil(next, today)
    due = {
      value: formatCardDate(next, false),
      detail: relativeDays(next, today),
      tone: days <= 3 ? 'danger' : days <= 7 ? 'warn' : 'neutral',
    }
  }

  return { promo, statement, due }
}

function Row({ label, item }: { label: string; item: ScheduleItem }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="text-slate-500 flex-shrink-0">{label}</dt>
      <dd className="text-right min-w-0">
        <span className="text-slate-900 font-medium tabular-nums">{item.value}</span>
        <span className={cn('ml-1.5 tabular-nums', toneClass[item.tone], item.tone !== 'neutral' && 'font-semibold')}>{item.detail}</span>
      </dd>
    </div>
  )
}

export default function CardSchedule({ card, onEdit, className }: { card: CreditCardDates; onEdit?: () => void; className?: string }) {
  const { promo, statement, due } = getCardSchedule(card)

  if (!promo && !statement && !due) {
    return (
      <div className={cn('flex items-center justify-between gap-2 text-xs text-slate-400', className)}>
        <span>No 0% end, statement or due date set</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-brand-500 hover:text-brand-600 font-medium">
            Set dates
          </button>
        )}
      </div>
    )
  }

  return (
    <dl className={cn('space-y-1.5', className)}>
      {promo && <Row label="0% rate ends" item={promo} />}
      {statement && <Row label="Next statement" item={statement} />}
      {due && <Row label="Payment due" item={due} />}
    </dl>
  )
}
