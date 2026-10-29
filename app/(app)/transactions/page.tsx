'use client'

import { useEffect, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import TransactionTable from '@/components/transactions/TransactionTable'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    accountId: '',
    month: '',
    type: '',
    search: '',
  })
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  async function fetchData() {
    const params = new URLSearchParams()
    if (filters.accountId) params.set('accountId', filters.accountId)
    if (filters.month) params.set('month', filters.month)
    params.set('limit', LIMIT.toString())
    params.set('offset', offset.toString())

    const [txRes, accRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch('/api/accounts'),
    ])

    if (txRes.ok) {
      const data = await txRes.json()
      setTransactions(data.transactions)
      setTotal(data.total)
    }
    if (accRes.ok) setAccounts(await accRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filters, offset])

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Client-side filter by search and type
  const filtered = transactions.filter(tx => {
    if (filters.type && tx.type !== filters.type) return false
    if (filters.search && !tx.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  // Totals for filtered
  const totalIncome = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0)

  // Month options (last 24 months)
  const monthOptions: string[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} total transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (filters.accountId) params.set('accountId', filters.accountId)
              if (filters.month) params.set('month', filters.month)
              window.location.href = `/api/export?${params}`
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Export to CSV"
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-4 text-center">
            <p className="text-slate-400 text-xs">Showing</p>
            <p className="font-serif text-slate-900 text-2xl tabular-nums">{filtered.length}</p>
            <p className="text-slate-400 text-xs">transactions</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-slate-400 text-xs">Total income</p>
            <p className="font-serif text-emerald-600 text-2xl tabular-nums break-words">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-slate-400 text-xs">Total expenses</p>
            <p className="font-serif text-red-500 text-2xl tabular-nums break-words">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="input pl-9"
          />
        </div>

        <select
          value={filters.accountId}
          onChange={e => { setFilters(f => ({ ...f, accountId: e.target.value })); setOffset(0) }}
          className="input w-auto"
        >
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select
          value={filters.month}
          onChange={e => { setFilters(f => ({ ...f, month: e.target.value })); setOffset(0) }}
          className="input w-auto"
        >
          <option value="">All months</option>
          {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="input w-auto"
        >
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
          <option value="TRANSFER">Transfer</option>
        </select>

        {(filters.accountId || filters.month || filters.type || filters.search) && (
          <button
            onClick={() => { setFilters({ accountId: '', month: '', type: '', search: '' }); setOffset(0) }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-5">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
          </div>
        ) : (
          <TransactionTable
            transactions={filtered}
            showAccount
            onDelete={handleDelete}
          />
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-rule">
            <p className="text-slate-400 text-sm">{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                className="btn-secondary text-sm"
              >
                Previous
              </button>
              <button
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset(o => o + LIMIT)}
                className="btn-secondary text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
