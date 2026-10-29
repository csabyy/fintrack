import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isBankSyncEnabled, truelayerEnv } from '@/lib/truelayer'

export const dynamic = 'force-dynamic'

// Tells the UI whether TrueLayer bank sync is configured, and which of the user's accounts last failed to sync.
export async function GET() {
  const enabled = isBankSyncEnabled()
  const session = await getServerSession(authOptions)

  const failures = enabled && session?.user?.id
    ? (await db.bankConnection.findMany({
        where: { userId: session.user.id, lastSyncError: { not: null } },
        select: { lastSyncError: true, lastSyncAttemptAt: true, bankAccount: { select: { id: true, name: true } } },
        orderBy: { lastSyncAttemptAt: 'desc' },
      })).map(c => ({
        accountId: c.bankAccount.id,
        accountName: c.bankAccount.name,
        error: c.lastSyncError,
        at: c.lastSyncAttemptAt,
      }))
    : []

  return NextResponse.json({ enabled, env: enabled ? truelayerEnv() : null, failures })
}
