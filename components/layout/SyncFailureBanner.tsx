'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'
import { formatSyncTime } from '@/lib/utils'

export const BANK_SYNC_EVENT = 'fintrack:bank-sync'
const DISMISS_KEY = 'fintrack:sync-failures-dismissed'

interface SyncFailure {
  accountId: string
  accountName: string
  error: string
  at: string | null
}

/** Shows failed bank syncs (scheduled or manual) on every page until dismissed or fixed. */
export default function SyncFailureBanner() {
  const pathname = usePathname()
  const [failures, setFailures] = useState<SyncFailure[]>([])
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY))
    const load = () =>
      fetch('/api/banking/status')
        .then(r => (r.ok ? r.json() : { failures: [] }))
        .then(d => setFailures(d.failures ?? []))
        .catch(() => {})
    load()
    window.addEventListener(BANK_SYNC_EVENT, load)
    return () => window.removeEventListener(BANK_SYNC_EVENT, load)
  }, [pathname])

  const key = failures.map(f => `${f.accountId}@${f.at}`).join(',')
  if (failures.length === 0 || dismissed === key) return null

  return (
    <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">
          Bank sync failed for {failures.length === 1 ? '1 account' : `${failures.length} accounts`}
        </p>
        <ul className="space-y-0.5">
          {failures.map(f => (
            <li key={f.accountId} className="break-words">
              <Link href={`/accounts/${f.accountId}`} className="font-medium underline underline-offset-2">{f.accountName}</Link>
              {f.at && <span className="text-red-500"> · {formatSyncTime(f.at)}</span>}
              <span>: {f.error}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => { localStorage.setItem(DISMISS_KEY, key); setDismissed(key) }}
        aria-label="Dismiss"
        className="w-7 h-7 flex flex-shrink-0 items-center justify-center rounded-lg hover:bg-red-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}
