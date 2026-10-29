'use client'

import { useState } from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { ACCOUNT_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

type AccountType = 'CURRENT' | 'CREDIT_CARD'

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string; icon: typeof Landmark }> = [
  { value: 'CURRENT', label: 'Current account', icon: Landmark },
  { value: 'CREDIT_CARD', label: 'Credit card', icon: CreditCard },
]

interface AccountFormProps {
  onSuccess: () => void
  onCancel: () => void
  initial?: {
    id?: string | null
    name?: string | null
    bankName?: string | null
    type?: AccountType | null
    color?: string | null
    notes?: string | null
    promoEndDate?: string | null
    statementDay?: number | null
    paymentDueDay?: number | null
  } | null
}

export default function AccountForm({ onSuccess, onCancel, initial }: AccountFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: initial?.name || '',
    bankName: initial?.bankName || '',
    type: initial?.type || ('CURRENT' as AccountType),
    color: initial?.color || ACCOUNT_COLORS[0],
    notes: initial?.notes || '',
    promoEndDate: initial?.promoEndDate?.slice(0, 10) || '',
    statementDay: initial?.statementDay?.toString() || '',
    paymentDueDay: initial?.paymentDueDay?.toString() || '',
  })
  const isCard = form.type === 'CREDIT_CARD'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = initial?.id ? `/api/accounts/${initial.id}` : '/api/accounts'
      const method = initial?.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          bankName: form.bankName,
          type: form.type,
          color: form.color,
          notes: form.notes,
          promoEndDate: isCard && form.promoEndDate ? form.promoEndDate : null,
          statementDay: isCard && form.statementDay ? parseInt(form.statementDay, 10) : null,
          paymentDueDay: isCard && form.paymentDueDay ? parseInt(form.paymentDueDay, 10) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save account')
        return
      }

      onSuccess()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Account type</label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.type === value}
              onClick={() => setForm(f => ({ ...f, type: value }))}
              className={cn(
                'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                form.type === value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">{isCard ? 'Card name' : 'Account name'}</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={isCard ? 'e.g. Barclaycard Platinum' : 'e.g. Main Current Account'}
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Bank name</label>
        <input
          type="text"
          value={form.bankName}
          onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
          placeholder="e.g. Barclays, Monzo"
          className="input"
          required
        />
      </div>

      {isCard && (
        <div className="space-y-3 rounded-xl border border-rule p-3">
          <div>
            <label className="label">0% rate ends</label>
            <input
              type="date"
              value={form.promoEndDate}
              onChange={e => setForm(f => ({ ...f, promoEndDate: e.target.value }))}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Statement day</label>
              <input
                type="number"
                min={1}
                max={31}
                step={1}
                inputMode="numeric"
                value={form.statementDay}
                onChange={e => setForm(f => ({ ...f, statementDay: e.target.value }))}
                placeholder="1–31"
                className="input"
              />
            </div>
            <div>
              <label className="label">Payment due day</label>
              <input
                type="number"
                min={1}
                max={31}
                step={1}
                inputMode="numeric"
                value={form.paymentDueDay}
                onChange={e => setForm(f => ({ ...f, paymentDueDay: e.target.value }))}
                placeholder="1–31"
                className="input"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">All optional. Statement and payment days repeat every month.</p>
        </div>
      )}

      <div>
        <label className="label">Color</label>
        <div className="flex gap-2 flex-wrap">
          {ACCOUNT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setForm(f => ({ ...f, color }))}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                form.color === color && 'ring-2 ring-offset-2 ring-offset-card ring-slate-400 scale-110'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Anything else worth remembering about this account"
          rows={3}
          maxLength={500}
          className="input resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">{form.notes.length}/500</p>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: form.color }}>
            {form.name.slice(0, 2).toUpperCase() || 'AC'}
          </div>
          <div>
            <p className="text-slate-800 font-medium text-sm">{form.name || 'Account name'}</p>
            <p className="text-slate-400 text-xs">{form.bankName || 'Bank name'} · {isCard ? 'Credit card' : 'Current account'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : initial?.id ? 'Save Changes' : 'Add Account'}
        </button>
      </div>
    </form>
  )
}
