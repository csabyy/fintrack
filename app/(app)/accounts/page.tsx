'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, Link2, Link2Off, RefreshCw, CheckCircle, LayoutGrid, List } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { CARD_SORT_OPTIONS, sortCreditCards, type CardSort } from '@/lib/credit-cards'
import Modal from '@/components/ui/Modal'
import AccountForm from '@/components/accounts/AccountForm'
import AccountList from '@/components/accounts/AccountList'
import BankLogo from '@/components/accounts/BankLogo'
import CardSchedule from '@/components/accounts/CardSchedule'
import CreditCardSummary from '@/components/accounts/CreditCardSummary'
import SyncStatus from '@/components/accounts/SyncStatus'
import ConnectionExpiry from '@/components/accounts/ConnectionExpiry'
import { BANK_SYNC_EVENT } from '@/components/layout/SyncFailureBanner'

type View = 'tiles' | 'list'
const VIEW_STORAGE_KEY = 'fintrack:accounts-view'

interface Account {
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
  _count: { transactions: number }
  transactions: Array<{ amount: number; type: string }>
  bankConnection?: {
    lastSyncedAt: string | null
    lastSyncAttemptAt: string | null
    lastSyncError: string | null
    logoUri: string | null
    createdAt: string
    consentExpiresAt: string | null
    accountType?: string
  } | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [cardSort, setCardSort] = useState<CardSort>('promo')
  const [view, setView] = useState<View>('tiles')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [bankSyncEnabled, setBankSyncEnabled] = useState(false)
  const searchParams = useSearchParams()

  async function fetchAccounts() {
    const res = await fetch('/api/accounts')
    if (res.ok) setAccounts(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchAccounts()
    if (localStorage.getItem(VIEW_STORAGE_KEY) === 'list') setView('list')
    fetch('/api/banking/status')
      .then(r => (r.ok ? r.json() : { enabled: false }))
      .then(d => setBankSyncEnabled(!!d.enabled))
      .catch(() => setBankSyncEnabled(false))
    if (searchParams.get('connected') === 'true') {
      setSuccessMsg('Bank connected successfully! Transactions are being imported.')
      setTimeout(() => setSuccessMsg(null), 5000)
    }
    if (searchParams.get('error')) {
      setSuccessMsg(`Connection failed: ${searchParams.get('error')}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this account and all its transactions? This cannot be undone.')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  async function handleConnect(accountId: string) {
    window.location.href = `/api/banking/connect?accountId=${accountId}`
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Disconnect this bank? Existing transactions will be kept.')) return
    await fetch(`/api/banking/disconnect?accountId=${accountId}`, { method: 'DELETE' })
    fetchAccounts()
  }

  async function handleSync(accountId: string) {
    setSyncing(accountId)
    const res = await fetch('/api/banking/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    const data = await res.json().catch(() => ({}))
    setSyncing(null)
    window.dispatchEvent(new Event(BANK_SYNC_EVENT))
    fetchAccounts()
    if (data.imported !== undefined) {
      setSuccessMsg(`Synced! ${data.imported} new transactions imported.`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } else if (data.error) {
      setSuccessMsg(`Sync failed: ${data.error}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const sections = [
    {
      key: 'cards',
      title: 'Credit cards',
      accounts: sortCreditCards(accounts.filter(a => a.type === 'CREDIT_CARD'), cardSort),
      sortable: true,
    },
    {
      key: 'current',
      title: 'Current accounts',
      accounts: accounts.filter(a => a.type !== 'CREDIT_CARD'),
      sortable: false,
    },
  ].filter(s => s.accounts.length > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {successMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
          successMsg.includes('failed') || successMsg.includes('error')
            ? 'bg-red-50 text-red-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Credit cards and current accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5" role="group" aria-label="View">
            {([['tiles', LayoutGrid, 'Tile view'], ['list', List, 'List view']] as const).map(([value, Icon, label]) => (
              <button
                key={value}
                onClick={() => { setView(value); localStorage.setItem(VIEW_STORAGE_KEY, value) }}
                title={label}
                aria-label={label}
                aria-pressed={view === value}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                  view === value ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-700'
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} />
            Add Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-brand-500" size={28} />
          </div>
          <h2 className="font-serif text-slate-900 font-medium text-xl mb-2">Add your first account</h2>
          <p className="text-slate-500 text-sm mb-6">Track balances and analyze spending across all your banks.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mx-auto flex items-center gap-2">
            <Plus size={15} />
            Add Account
          </button>
        </div>
      ) : (
        sections.map(section => (
        <section key={section.key} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-slate-900 font-medium text-xl">{section.title}</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{section.accounts.length}</span>
            </div>
            {section.sortable && section.accounts.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Sort by
                <select
                  value={cardSort}
                  onChange={e => setCardSort(e.target.value as CardSort)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-card text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CARD_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            )}
          </div>
        {section.key === 'cards' && <CreditCardSummary cards={section.accounts} />}
        {view === 'list' ? (
          <AccountList
            accounts={section.accounts}
            cards={section.key === 'cards'}
            showSync={bankSyncEnabled}
            onEdit={a => setEditing(section.accounts.find(x => x.id === a.id) ?? null)}
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.accounts.map(account => {
            const recentIncome = account.transactions
              .filter(t => t.type === 'INCOME')
              .reduce((s, t) => s + t.amount, 0)
            const recentExpenses = account.transactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
            const isConnected = !!account.bankConnection
            const isCard = account.type === 'CREDIT_CARD'

            return (
              <div key={account.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BankLogo
                      logoUri={account.bankConnection?.logoUri}
                      name={account.name}
                      bankName={account.bankName}
                      color={account.color}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-slate-900 font-semibold text-sm">{account.name}</p>
                        {bankSyncEnabled && isConnected && (
                          account.bankConnection?.lastSyncError
                            ? <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Last sync failed" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Auto-sync active" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <span>{account.bankName}</span>
                        {(account.cardNetwork || account.lastFourDigits) && (
                          <span>· {account.cardNetwork || 'Card'} {account.lastFourDigits ? `(••${account.lastFourDigits})` : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/accounts/${account.id}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <ArrowUpRight size={14} />
                  </Link>
                </div>

                <div className="mb-3">
                  <p className="text-slate-400 text-xs mb-1">
                    {isCard ? 'Card balance' : 'Current balance'}
                  </p>
                  <p className={`font-serif text-[2rem] leading-tight tabular-nums break-words ${account.balance < 0 ? 'text-red-500' : 'text-brand-500'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                  {account.balance < 0 && (
                    <p className="text-red-400 text-xs font-medium mt-0.5">Amount owed</p>
                  )}
                </div>

                {isCard && (
                  <CardSchedule
                    card={account}
                    onEdit={() => setEditing(account)}
                    className="mb-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100"
                  />
                )}

                {account.creditLimit && account.creditLimit > 0 ? (
                  <div className="mb-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Limit: {formatCurrency(account.creditLimit)}</span>
                      <span className="font-medium text-slate-700">
                        Available: {formatCurrency(Math.max(0, account.creditLimit - Math.abs(account.balance)))}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
                  </div>
                ) : null}

                {account.notes && (
                  <div className="mb-3 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed whitespace-pre-line">
                    <span className="font-semibold text-amber-800 text-[10px] uppercase tracking-wider block mb-0.5">Note</span>
                    {account.notes}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-rule">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <TrendingUp size={13} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Income</p>
                      <p className="text-slate-700 text-sm font-semibold">{formatCurrency(recentIncome)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                      <TrendingDown size={13} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Expenses</p>
                      <p className="text-slate-700 text-sm font-semibold">{formatCurrency(recentExpenses)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs">{account._count.transactions} transactions</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditing(account)}
                        className="text-slate-500 hover:text-brand-500 text-xs underline underline-offset-2 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-slate-500 hover:text-red-500 text-xs underline underline-offset-2 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {!bankSyncEnabled ? null : isConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(account.id)}
                        disabled={syncing === account.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <RefreshCw size={11} className={syncing === account.id ? 'animate-spin' : ''} />
                        {syncing === account.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Link2Off size={11} />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(account.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      <Link2 size={11} />
                      Connect Bank
                    </button>
                  )}

                  {bankSyncEnabled && account.bankConnection && (
                    <>
                      <ConnectionExpiry
                        connectedAt={account.bankConnection.createdAt}
                        expiresAt={account.bankConnection.consentExpiresAt}
                      />
                      <SyncStatus connection={account.bankConnection} className="text-xs text-center" />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
        </section>
        ))
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Account" size="md">
        <AccountForm
          onSuccess={() => { setShowAdd(false); fetchAccounts() }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Account" size="md">
        {editing && (
          <AccountForm
            key={editing.id}
            initial={editing}
            onSuccess={() => { setEditing(null); fetchAccounts() }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
