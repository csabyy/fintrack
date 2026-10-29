'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, Edit2, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import TransactionTable from '@/components/transactions/TransactionTable'
import Modal from '@/components/ui/Modal'
import AccountForm from '@/components/accounts/AccountForm'
import CardSchedule from '@/components/accounts/CardSchedule'

interface AccountDetail {
  id: string
  name: string
  bankName: string
  type: 'CURRENT' | 'CREDIT_CARD'
  balance: number
  color: string
  notes?: string | null
  creditLimit?: number | null
  promoEndDate?: string | null
  statementDay?: number | null
  paymentDueDay?: number | null
  cardNetwork?: string | null
  lastFourDigits?: string | null
  validFrom?: string | null
  validTo?: string | null
  bankConnection?: { id?: string; lastSyncedAt: string | null; accountType?: string } | null
  transactions: Array<any>
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string>('')

  async function fetchData() {
    const accRes = await fetch(`/api/accounts/${id}`)
    if (!accRes.ok) { router.push('/accounts'); return }
    setAccount(await accRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function handleDeleteTx(txId: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading || !account) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  // Build monthly category breakdown
  const categoryTotals: Record<string, { total: number; color: string; icon?: string }> = {}
  for (const tx of account.transactions) {
    if (tx.type !== 'EXPENSE') continue
    const name = tx.category?.name || 'Uncategorized'
    if (!categoryTotals[name]) {
      categoryTotals[name] = { total: 0, color: tx.category?.color || '#7B8592', icon: tx.category?.icon }
    }
    categoryTotals[name].total += Math.abs(tx.amount)
  }
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)

  const barData = sortedCategories.map(([name, v]) => ({
    name: name.length > 12 ? name.slice(0, 12) + '…' : name,
    amount: v.total,
    fill: v.color,
  }))

  // Month filter options
  const months = Array.from(new Set(
    account.transactions.map(tx => tx.date.slice(0, 7))
  )).sort().reverse().slice(0, 12)

  const filteredTx = activeMonth
    ? account.transactions.filter(tx => tx.date.slice(0, 7) === activeMonth)
    : account.transactions

  const isCard = account.type === 'CREDIT_CARD'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/accounts" className="w-9 h-9 flex items-center justify-center rounded-[3px] bg-card border border-rule-strong text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: account.color }}>
              {account.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-[1.75rem] leading-tight font-normal text-slate-900">{account.name}</h1>
                {isCard && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Credit card
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm">
                {account.bankName}
                {account.cardNetwork ? ` · ${account.cardNetwork}` : ''}
                {account.lastFourDigits ? ` (•••• ${account.lastFourDigits})` : ''}
                {account.validTo ? ` · Exp ${account.validTo}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit2 size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="card p-6" style={{ boxShadow: `inset 3px 0 0 ${account.color}` }}>
        <p className="text-slate-500 text-sm mb-1">
          {isCard ? 'Card balance' : 'Current balance'}
        </p>
        <p className={`font-serif text-5xl leading-tight tabular-nums break-words ${account.balance < 0 ? 'text-red-500' : 'text-brand-500'}`}>
          {formatCurrency(account.balance)}
        </p>
        {account.balance < 0 && (
          <p className="text-red-400 text-xs font-medium mt-0.5">Amount owed</p>
        )}
        <p className="text-slate-400 text-sm mt-1">{account.transactions.length} total transactions</p>

        {isCard && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <CardSchedule card={account} onEdit={() => setShowEdit(true)} className="max-w-md" />
          </div>
        )}

        {/* Credit Limit & Details if available */}
        {(account.creditLimit || account.cardNetwork || account.lastFourDigits) && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CreditCard size={16} className="text-slate-400" />
                <span className="font-medium">{account.cardNetwork || 'Credit Card'}</span>
                {account.lastFourDigits && <span>•••• {account.lastFourDigits}</span>}
                {account.validTo && <span className="text-slate-400 text-xs">Expires {account.validTo}</span>}
              </div>
            </div>

            {account.creditLimit && account.creditLimit > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span>Credit Limit: <strong className="text-slate-900">{formatCurrency(account.creditLimit)}</strong></span>
                  <span>Available Credit: <strong className="text-emerald-600">{formatCurrency(Math.max(0, account.creditLimit - Math.abs(account.balance)))}</strong></span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      Math.abs(account.balance) / account.creditLimit > 0.8
                        ? 'bg-red-500'
                        : Math.abs(account.balance) / account.creditLimit > 0.5
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (Math.abs(account.balance) / account.creditLimit) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {((Math.abs(account.balance) / account.creditLimit) * 100).toFixed(1)}% credit utilized
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Card */}
      {account.notes && (
        <div className="card p-5 border-l-4 border-l-amber-400 bg-amber-50/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Account Notes</span>
            <button
              onClick={() => setShowEdit(true)}
              className="text-xs text-amber-700 hover:text-amber-900 underline"
            >
              Edit Note
            </button>
          </div>
          <p className="text-slate-800 text-sm whitespace-pre-line leading-relaxed">{account.notes}</p>
        </div>
      )}

      {/* Category breakdown chart */}
      {sortedCategories.length > 0 && (
        <div className="card p-5">
          <h2 className="font-serif text-slate-900 font-medium text-lg mb-4">Spending by category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--ink-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--ink-2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
              <Tooltip
                cursor={{ fill: 'var(--rule)' }}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--rule-strong)', borderRadius: '3px', color: 'var(--ink)' }}
                formatter={v => [formatCurrency(Number(v)), 'Spent']}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-slate-900 font-medium text-lg">Transactions</h2>
          {months.length > 0 && (
            <select
              value={activeMonth}
              onChange={e => setActiveMonth(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-card text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All time</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        <TransactionTable
          transactions={filteredTx}
          onDelete={handleDeleteTx}
        />
      </div>

      {/* Modals */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Account" size="md">
        <AccountForm
          initial={account}
          onSuccess={() => { setShowEdit(false); fetchData() }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  )
}

