import { cn, formatCurrency } from '@/lib/utils'

interface Card {
  balance: number
  creditLimit?: number | null
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className={cn('font-serif text-2xl leading-tight tabular-nums break-words text-slate-900', tone)}>{value}</p>
    </div>
  )
}

export default function CreditCardSummary({ cards }: { cards: Card[] }) {
  const owedOf = (c: Card) => Math.max(0, -c.balance)
  const limited = cards.filter(c => c.creditLimit && c.creditLimit > 0)

  const totalBalance = cards.reduce((s, c) => s + c.balance, 0)
  const totalLimit = limited.reduce((s, c) => s + c.creditLimit!, 0)
  const owedOnLimited = limited.reduce((s, c) => s + owedOf(c), 0)
  const available = Math.max(0, totalLimit - owedOnLimited)
  const utilisation = totalLimit > 0 ? (owedOnLimited / totalLimit) * 100 : null
  const barTone = utilisation === null ? '' : utilisation > 80 ? 'bg-red-500' : utilisation > 50 ? 'bg-amber-500' : 'bg-emerald-500'
  const withoutLimit = cards.length - limited.length

  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total balance" value={formatCurrency(totalBalance)} tone={totalBalance < 0 ? 'text-red-500' : undefined} />
        <Stat label="Total credit limit" value={totalLimit > 0 ? formatCurrency(totalLimit) : '—'} />
        <Stat label="Available credit" value={totalLimit > 0 ? formatCurrency(available) : '—'} tone="text-emerald-600" />
        <Stat label="Utilisation" value={utilisation === null ? '—' : `${utilisation.toFixed(1)}%`} />
      </div>

      {utilisation !== null && (
        <div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', barTone)} style={{ width: `${Math.min(100, utilisation)}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {formatCurrency(owedOnLimited)} used of {formatCurrency(totalLimit)}
            {withoutLimit > 0 && ` · ${withoutLimit} ${withoutLimit === 1 ? 'card has' : 'cards have'} no known limit and ${withoutLimit === 1 ? 'is' : 'are'} not counted`}
          </p>
        </div>
      )}
    </div>
  )
}
