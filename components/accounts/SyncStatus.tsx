import { cn, formatSyncTime } from '@/lib/utils'

export interface SyncInfo {
  lastSyncedAt: string | null
  lastSyncAttemptAt?: string | null
  lastSyncError?: string | null
}

export default function SyncStatus({ connection, compact = false, className }: {
  connection: SyncInfo
  compact?: boolean
  className?: string
}) {
  const { lastSyncedAt, lastSyncAttemptAt, lastSyncError } = connection

  if (lastSyncError) {
    return (
      <div className={cn('text-red-600', className)} title={lastSyncError}>
        <p className="font-semibold">Sync failed{lastSyncAttemptAt ? ` · ${formatSyncTime(lastSyncAttemptAt)}` : ''}</p>
        {!compact && <p className="text-red-500 break-words">{lastSyncError}</p>}
        {lastSyncedAt && <p className="text-slate-400">Last success {formatSyncTime(lastSyncedAt)}</p>}
      </div>
    )
  }

  if (!lastSyncedAt) return <p className={cn('text-slate-400', className)}>Not synced yet</p>
  return (
    <p className={cn(compact ? 'text-slate-600' : 'text-slate-400', className)}>
      {compact ? formatSyncTime(lastSyncedAt) : `Last synced ${formatSyncTime(lastSyncedAt)}`}
    </p>
  )
}
