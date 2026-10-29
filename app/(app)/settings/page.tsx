'use client'

import { useEffect, useState } from 'react'
import { User, Lock, Tag, Sliders, Plus, Pencil, Trash2, Check, X, Target } from 'lucide-react'
import { cn, ACCOUNT_COLORS, formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

const CATEGORY_ICONS = ['🏠', '🚗', '🛒', '🍽️', '☕', '✈️', '💊', '🎮', '📚', '👗', '💼', '🎁', '💡', '📱', '🏋️', '🐾', '🎵', '🏦', '📦', '💰', '🔧', '🌿']

type Tab = 'profile' | 'categories' | 'preferences' | 'budgets'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [settings, setSettings] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [budgetData, setBudgetData] = useState<{ budgets: any[]; categories: any[] }>({ budgets: [], categories: [] })
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const [settRes, catRes, budgetRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/categories'),
      fetch('/api/budgets'),
    ])
    if (settRes.ok) setSettings(await settRes.json())
    if (catRes.ok) setCategories(await catRes.json())
    if (budgetRes.ok) setBudgetData(await budgetRes.json())
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded-xl w-48" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-slate-100 border border-rule p-1 rounded-md w-fit max-w-full">
        {([
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'categories', label: 'Categories', icon: Tag },
          { id: 'budgets', label: 'Budgets', icon: Target },
          { id: 'preferences', label: 'Preferences', icon: Sliders },
        ] as { id: Tab; label: string; icon: any }[]).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[3px] text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-card text-slate-900 font-semibold shadow-[inset_0_-2px_0_var(--accent)]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'profile' && (
        <ProfileTab user={settings?.user} onSaved={loadData} />
      )}
      {tab === 'categories' && (
        <CategoriesTab categories={categories} onChanged={loadData} />
      )}
      {tab === 'budgets' && (
        <BudgetsTab data={budgetData} onChanged={loadData} />
      )}
      {tab === 'preferences' && (
        <PreferencesTab preference={settings?.preference} onSaved={loadData} />
      )}
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, onSaved }: { user: any; onSaved: () => void }) {
  const [name, setName] = useState(user?.name ?? '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'profile', name }),
    })
    setSaving(false)
    if (res.ok) { setMsg({ type: 'success', text: 'Name updated!' }); onSaved() }
    else setMsg({ type: 'error', text: 'Failed to update name' })
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setMsg({ type: 'error', text: 'Passwords do not match' }); return }
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'profile', currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setMsg({ type: 'success', text: 'Password changed!' }); setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    else setMsg({ type: 'error', text: data.error ?? 'Failed to change password' })
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={cn('px-4 py-3 rounded-xl text-sm font-medium', msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {msg.text}
        </div>
      )}

      {/* Name */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-brand-500" />
          <h3 className="font-serif text-lg font-medium text-slate-900">Profile</h3>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Email (cannot change)</p>
          <p className="text-slate-700 font-medium">{user?.email}</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Display name</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-brand-500" />
          <h3 className="font-serif text-lg font-medium text-slate-900">Change password</h3>
        </div>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Current password</label>
            <input type="password" className="input" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">New password (min 6 chars)</label>
            <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Confirm new password</label>
            <input type="password" className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>
          <button type="submit" disabled={saving || !currentPw || !newPw} className="btn-primary text-sm">
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Categories Tab ────────────────────────────────────────────────────────────
function CategoriesTab({ categories, onChanged }: { categories: any[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#1E4C8A')
  const [newIcon, setNewIcon] = useState('📦')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openEdit(cat: any) {
    setEditing(cat)
    setNewName(cat.name)
    setNewColor(cat.color)
    setNewIcon(cat.icon ?? '📦')
  }

  function resetForm() {
    setNewName(''); setNewColor('#1E4C8A'); setNewIcon('📦'); setError('')
  }

  async function saveCategory() {
    if (!newName.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    if (editing) {
      const res = await fetch(`/api/categories/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor, icon: newIcon }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
      setEditing(null)
    } else {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor, icon: newIcon }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
      setShowAdd(false)
    }

    resetForm()
    setSaving(false)
    onChanged()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Cannot delete')
    } else {
      onChanged()
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-brand-500" />
            <h3 className="font-serif text-lg font-medium text-slate-900">Categories</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{categories.length}</span>
          </div>
          <button
            onClick={() => { resetForm(); setShowAdd(true) }}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Add category
          </button>
        </div>

        <div className="divide-y divide-rule">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                {cat.icon ?? '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium text-sm">{cat.name}</p>
                <p className="text-slate-400 text-xs">{cat._count?.transactions ?? 0} transactions</p>
              </div>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="flex gap-1">
                <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                  <Pencil size={13} />
                </button>
                {!cat.isDefault && (
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={showAdd || !!editing}
        onClose={() => { setShowAdd(false); setEditing(null); resetForm() }}
        title={editing ? `Edit "${editing.name}"` : 'New category'}
        size="sm"
      >
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Groceries" autoFocus />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={cn('w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all', newIcon === icon ? 'bg-brand-100 ring-2 ring-brand-500 scale-110' : 'hover:bg-slate-100')}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn('w-7 h-7 rounded-full transition-all', newColor === color ? 'ring-2 ring-offset-2 ring-offset-card ring-slate-400 scale-110' : 'hover:scale-105')}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowAdd(false); setEditing(null); resetForm() }} className="btn-secondary flex-1 text-sm">
              Cancel
            </button>
            <button onClick={saveCategory} disabled={saving} className="btn-primary flex-1 text-sm">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Preferences Tab ───────────────────────────────────────────────────────────
function PreferencesTab({ preference, onSaved }: { preference: any; onSaved: () => void }) {
  const [weekStart, setWeekStart] = useState(preference?.weekStartsOn ?? 1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preferences', weekStartsOn: weekStart }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Sliders size={16} className="text-brand-500" />
        <h3 className="font-serif text-lg font-medium text-slate-900">Preferences</h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Week starts on</label>
          <div className="flex gap-2">
            {[{ label: 'Monday', value: 1 }, { label: 'Sunday', value: 0 }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setWeekStart(opt.value)}
                className={cn(
                  'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                  weekStart === opt.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={cn('btn-primary text-sm flex items-center gap-2', saved && 'bg-emerald-500 hover:bg-emerald-600')}
      >
        {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : 'Save preferences'}
      </button>
    </div>
  )
}

// ─── Budgets Tab ──────────────────────────────────────────────────────────────
function BudgetsTab({ data, onChanged }: { data: { budgets: any[]; categories: any[] }; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const existingCatIds = new Set(data.budgets.map(b => b.categoryId))
  const availableCats = data.categories.filter(c => !existingCatIds.has(c.id))

  async function saveBudget() {
    if (!form.categoryId || !form.amount) { setError('Fill all fields'); return }
    setSaving(true)
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: form.categoryId, amount: parseFloat(form.amount) }),
    })
    setSaving(false)
    if (res.ok) { setShowAdd(false); setForm({ categoryId: '', amount: '' }); setError(''); onChanged() }
    else { const d = await res.json(); setError(d.error ?? 'Failed') }
  }

  async function deleteBudget(categoryId: string) {
    if (!confirm('Remove this budget?')) return
    await fetch(`/api/budgets?categoryId=${categoryId}`, { method: 'DELETE' })
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand-500" />
            <h3 className="font-serif text-lg font-medium text-slate-900">Monthly budgets</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{data.budgets.length}</span>
          </div>
          {availableCats.length > 0 && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} /> Add budget
            </button>
          )}
        </div>

        {data.budgets.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Target size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm mb-1">No budgets set</p>
            <p className="text-slate-400 text-xs">Set monthly spending limits per category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.budgets.map(b => {
              const pct = Math.min(b.percentUsed, 100)
              const over = b.spent > b.amount
              return (
                <div key={b.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{b.category?.icon ?? '📦'}</span>
                      <span className="text-sm font-medium text-slate-800">{b.category?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-sm font-semibold', over ? 'text-red-500' : 'text-slate-600')}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                      </span>
                      <button onClick={() => deleteBudget(b.categoryId)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', over ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-brand-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={cn('text-xs', over ? 'text-red-500 font-medium' : 'text-slate-400')}>
                    {over
                      ? `⚠ ${formatCurrency(Math.abs(b.remaining))} over budget this month`
                      : `${formatCurrency(b.remaining)} remaining — ${pct}% used`}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setError('') }} title="Set budget" size="sm">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Category</label>
            <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select category…</option>
              {availableCats.map(c => <option key={c.id} value={c.id}>{c.icon ?? '📦'} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Monthly limit (£)</label>
            <input type="number" min="1" step="1" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowAdd(false); setError('') }} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button onClick={saveBudget} disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Saving…' : 'Set budget'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
