import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { CreditCardDates } from '@/lib/credit-cards'
import { getCardSchedule, toneClass, type ScheduleItem } from '@/components/accounts/CardSchedule'
import BankLogo from '@/components/accounts/BankLogo'
import SyncStatus, { type SyncInfo } from '@/components/accounts/SyncStatus'

export interface AccountListItem extends CreditCardDates {
  id: string
  name: string
  bankName: string
  balance: number
  color: string
  creditLimit?: number | null
  lastFourDigits?: string | null
  bankConnection?: (SyncInfo & { logoUri?: string | null }) | null
}

function DateCell({ item }: { item: ScheduleItem | null }) {
  if (!item) return <td className="px-3 py-2.5 text-slate-300">—</td>
  return (
    <td className="px-3 py-2.5 whitespace-nowrap">
      <p className="text-slate-900 tabular-nums">{item.value}</p>
      <p className={cn('text-xs tabular-nums', toneClass[item.tone], item.tone !== 'neutral' && 'font-semibold')}>{item.detail}</p>
    </td>
  )
}

export default function AccountList({ accounts, cards, showSync, onEdit }: {
  accounts: AccountListItem[]
  cards: boolean
  showSync: boolean
  onEdit: (account: AccountListItem) => void
}) {
  const today = new Date()
  const th = 'px-3 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap'

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-rule">
          <tr>
            <th className={th}>{cards ? 'Card' : 'Account'}</th>
            <th className={cn(th, 'text-right')}>Balance</th>
            {cards && (
              <>
                <th className={cn(th, 'text-right')}>Limit</th>
                <th className={th}>0% ends</th>
                <th className={th}>Statement</th>
                <th className={th}>Payment due</th>
              </>
            )}
            {showSync && <th className={th}>Last synced</th>}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {accounts.map(account => {
            const schedule = cards ? getCardSchedule(account, today) : null
            const limit = account.creditLimit && account.creditLimit > 0 ? account.creditLimit : null
            return (
              <tr key={account.id} className="hover:bg-paper-2 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-[10rem]">
                    <BankLogo
                      size="sm"
                      logoUri={account.bankConnection?.logoUri}
                      name={account.name}
                      bankName={account.bankName}
                      color={account.color}
                    />
                    <div className="min-w-0">
                      <Link href={`/accounts/${account.id}`} className="text-slate-900 font-medium hover:text-brand-500 truncate block">
                        {account.name}
                      </Link>
                      <p className="text-slate-400 text-xs truncate">
                        {account.bankName}{account.lastFourDigits ? ` · ••${account.lastFourDigits}` : ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap', account.balance < 0 ? 'text-red-500' : 'text-slate-900')}>
                  {formatCurrency(account.balance)}
                </td>
                {schedule && (
                  <>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {limit ? (
                        <>
                          <p className="text-slate-900 tabular-nums">{formatCurrency(limit)}</p>
                          <p className="text-slate-500 text-xs tabular-nums">
                            {formatCurrency(Math.max(0, limit - Math.abs(account.balance)))} free
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <DateCell item={schedule.promo} />
                    <DateCell item={schedule.statement} />
                    <DateCell item={schedule.due} />
                  </>
                )}
                {showSync && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {account.bankConnection
                      ? <SyncStatus connection={account.bankConnection} compact />
                      : <span className="text-slate-300">Not connected</span>}
                  </td>
                )}
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => onEdit(account)}
                    title="Edit"
                    aria-label={`Edit ${account.name}`}
                    className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
