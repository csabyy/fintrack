import { db } from '@/lib/db'
import { isBankSyncEnabled, syncBankAccount } from '@/lib/truelayer'

const TIME_ZONE = 'Europe/London'
const CHECK_INTERVAL_MS = 60 * 1000

const londonFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function londonTime(date: Date) {
  const p = Object.fromEntries(londonFormat.formatToParts(date).map(part => [part.type, part.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** BANK_SYNC_TIME as minutes after midnight (UK time); null when the daily sync is turned off. */
function syncMinutes(): number | null {
  const raw = (process.env.BANK_SYNC_TIME ?? '06:00').trim()
  if (raw === '' || raw.toLowerCase() === 'off') return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    console.warn(`Invalid BANK_SYNC_TIME "${raw}", using 06:00`)
    return 6 * 60
  }
  return Number(match[1]) * 60 + Number(match[2])
}

/** True when the connection has not been tried since today's scheduled time. */
function isDue(lastAttempt: Date | null, now: ReturnType<typeof londonTime>, at: number): boolean {
  if (!lastAttempt) return true
  const last = londonTime(lastAttempt)
  return last.day !== now.day || last.minutes < at
}

let running = false

async function tick(at: number) {
  if (running) return
  const now = londonTime(new Date())
  if (now.minutes < at) return

  running = true
  try {
    const connections = await db.bankConnection.findMany({
      select: { bankAccountId: true, lastSyncAttemptAt: true },
    })
    for (const conn of connections) {
      if (!isDue(conn.lastSyncAttemptAt, now, at)) continue
      const result = await syncBankAccount(conn.bankAccountId)
      if (result.success) {
        console.log(`Scheduled bank sync ok for ${conn.bankAccountId}: ${result.imported} new`)
      } else {
        console.error(`Scheduled bank sync failed for ${conn.bankAccountId}: ${result.error}`)
      }
    }
  } catch (error) {
    console.error('Scheduled bank sync error', error)
  } finally {
    running = false
  }
}

/** Syncs every linked account once a day at BANK_SYNC_TIME (UK time), catching up after downtime. */
export function startBankSyncScheduler() {
  const globalState = globalThis as { __fintrackSyncTimer?: NodeJS.Timeout }
  if (globalState.__fintrackSyncTimer || !isBankSyncEnabled()) return

  const at = syncMinutes()
  if (at === null) return

  globalState.__fintrackSyncTimer = setInterval(() => tick(at), CHECK_INTERVAL_MS)
  globalState.__fintrackSyncTimer.unref()
  console.log(`Daily bank sync scheduled at ${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')} ${TIME_ZONE}`)
}
