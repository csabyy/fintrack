'use client'

import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category?: { name: string; color: string; icon?: string } | null
  account?: { name: string; color: string }
  transferTo?: { name: string } | null
  notes?: string | null
}

interface TransactionTableProps {
  transactions: Transaction[]
  showAccount?: boolean
  onDelete?: (id: string) => void
}

const typeConfig = {
  INCOME: { icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Income' },
  EXPENSE: { icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50', label: 'Expense' },
  TRANSFER: { icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Transfer' },
}

export default function TransactionTable({
  transactions,
  showAccount = false,
  onDelete,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No transactions yet</p>
        <p className="text-sm mt-1">Connect a bank on the Accounts page to import transactions</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-rule">
      {transactions.map(tx => {
        const config = typeConfig[tx.type as keyof typeof typeConfig] || typeConfig.EXPENSE
        const Icon = config.icon

        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 sm:gap-4 py-3.5 px-1 hover:bg-slate-50 rounded-[3px] transition-colors group"
          >
            {/* Icon */}
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
              <Icon size={16} className={config.color} />
            </div>

            {/* Description + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-medium truncate">{tx.description}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                <span className="text-slate-400 text-xs">{formatDateShort(tx.date)}</span>
                {tx.category && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-[3px] font-medium text-slate-700"
                    style={{
                      backgroundColor: tx.category.color + '1A',
                      boxShadow: `inset 2px 0 0 ${tx.category.color}`,
                    }}
                  >
                    {tx.category.icon} {tx.category.name}
                  </span>
                )}
                {showAccount && tx.account && (
                  <span className="text-xs text-slate-400">• {tx.account.name}</span>
                )}
                {tx.transferTo && (
                  <span className="text-xs text-slate-400">→ {tx.transferTo.name}</span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <p className={cn(
                'text-sm font-semibold tabular-nums',
                tx.type === 'INCOME' ? 'text-emerald-600' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-slate-900'
              )}>
                {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                {formatCurrency(Math.abs(tx.amount))}
              </p>
            </div>

            {/* Delete */}
            {onDelete && (
              <button
                onClick={() => onDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-1"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
