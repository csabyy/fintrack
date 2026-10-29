import { db } from '@/lib/db'
import { autoDetectCategory, detectTransactionType } from '@/lib/categorizer'

/**
 * Optional TrueLayer bank sync.
 *
 * The feature is OFF unless both TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET
 * are set. TRUELAYER_ENV selects "sandbox" (default) or "live".
 */

export function isBankSyncEnabled(): boolean {
  return Boolean(process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET)
}

export function truelayerEnv(): 'sandbox' | 'live' {
  return process.env.TRUELAYER_ENV === 'live' ? 'live' : 'sandbox'
}

export function truelayerHosts() {
  return truelayerEnv() === 'live'
    ? { auth: 'https://auth.truelayer.com', api: 'https://api.truelayer.com' }
    : { auth: 'https://auth.truelayer-sandbox.com', api: 'https://api.truelayer-sandbox.com' }
}

export function truelayerProviders(): string {
  if (process.env.TRUELAYER_PROVIDERS) return process.env.TRUELAYER_PROVIDERS
  return truelayerEnv() === 'live'
    ? 'uk-ob-all uk-oauth-all'
    : 'uk-cs-mock uk-ob-all uk-oauth-all'
}

export function appUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function redirectUri(): string {
  return `${appUrl()}/api/banking/callback`
}

async function refreshAccessToken(connection: {
  id: string
  refreshToken: string
}): Promise<string | null> {
  const res = await fetch(`${truelayerHosts().auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.TRUELAYER_CLIENT_ID!,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      refresh_token: connection.refreshToken,
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await db.bankConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || connection.refreshToken,
      tokenExpiresAt: expiresAt,
    },
  })

  return tokens.access_token
}

export type SyncResult =
  | { success: true; imported: number; total: number }
  | { success: false; error: string; status: number }

const DAY_MS = 24 * 60 * 60 * 1000
// UK banks (e.g. Lloyds) only return data older than 90 days within 5 minutes of the user's bank login.
const MAX_HISTORY_DAYS = 89
// Re-fetch this much before the last sync so late-posting transactions are not missed.
const SYNC_OVERLAP_DAYS = 14

/** Signed amount from the account holder's view: money in is positive, money out negative. */
function signedAmount(tx: { amount: number; transaction_type?: string }, resourceType: 'accounts' | 'cards'): number {
  const amount = Math.abs(Number(tx.amount))
  if (tx.transaction_type === 'CREDIT') return amount
  if (tx.transaction_type === 'DEBIT') return -amount
  // TrueLayer cards report purchases as positive amounts
  return resourceType === 'cards' ? -Number(tx.amount) : Number(tx.amount)
}

/** Syncs one linked account and records the outcome on its connection (shown in the UI). */
export async function syncBankAccount(accountId: string): Promise<SyncResult> {
  let result: SyncResult
  try {
    result = await runSync(accountId)
  } catch (error) {
    console.error('Bank sync crashed', { accountId, error })
    result = { success: false, error: 'Unexpected error while syncing', status: 500 }
  }

  await db.bankConnection.updateMany({
    where: { bankAccountId: accountId },
    data: { lastSyncAttemptAt: new Date(), lastSyncError: result.success ? null : result.error },
  })
  return result
}

/** Bank logo and consent expiry from TrueLayer's /me endpoint. */
async function fetchProviderInfo(api: string, accessToken: string) {
  const res = await fetch(`${api}/data/v1/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return null
  const me = (await res.json()).results?.[0]
  const logo = me?.provider?.logo_uri
  const expires = me?.consent_expires_at ? new Date(me.consent_expires_at) : null
  return {
    logoUri: typeof logo === 'string' && logo.startsWith('https://') ? logo : null,
    consentExpiresAt: expires && !isNaN(expires.getTime()) ? expires : null,
  }
}

/** Pull recent transactions (up to 89 days) + current balance for one linked account. */
async function runSync(accountId: string): Promise<SyncResult> {
  if (!isBankSyncEnabled()) {
    return { success: false, error: 'Bank sync is not configured', status: 404 }
  }

  const connection = await db.bankConnection.findUnique({
    where: { bankAccountId: accountId },
  })
  if (!connection) {
    return { success: false, error: 'No bank connection found', status: 404 }
  }

  let accessToken = connection.accessToken
  if (new Date() >= connection.tokenExpiresAt) {
    const refreshed = await refreshAccessToken(connection)
    if (!refreshed) {
      return { success: false, error: 'Token refresh failed. Please reconnect your bank.', status: 401 }
    }
    accessToken = refreshed
  }

  const api = truelayerHosts().api

  const provider = await fetchProviderInfo(api, accessToken).catch(() => null)
  if (provider && (provider.logoUri || provider.consentExpiresAt)) {
    await db.bankConnection.update({
      where: { id: connection.id },
      data: {
        ...(provider.logoUri && { logoUri: provider.logoUri }),
        ...(provider.consentExpiresAt && { consentExpiresAt: provider.consentExpiresAt }),
      },
    })
  }
  // Use the correct TrueLayer resource path: /accounts for current/savings, /cards for credit cards
  const resourceType = connection.accountType === 'card' ? 'cards' : 'accounts'
  const now = Date.now()
  const earliest = now - MAX_HISTORY_DAYS * DAY_MS
  const fromMs = connection.lastSyncedAt
    ? Math.max(earliest, connection.lastSyncedAt.getTime() - SYNC_OVERLAP_DAYS * DAY_MS)
    : earliest
  const from = new Date(fromMs).toISOString().split('T')[0]
  const to = new Date(now).toISOString().split('T')[0]

  const txRes = await fetch(
    `${api}/data/v1/${resourceType}/${connection.truelayerAccountId}/transactions?from=${from}&to=${to}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!txRes.ok) {
    const body = await txRes.text()
    console.error('Failed to fetch transactions from TrueLayer', {
      status: txRes.status,
      statusText: txRes.statusText,
      headers: Object.fromEntries(txRes.headers.entries()),
      body,
    })
    if (body.includes('sca_exceeded')) {
      return { success: false, error: 'Your bank asked to re-authenticate. Disconnect and connect the bank again.', status: 403 }
    }
    return { success: false, error: `Failed to fetch transactions from bank (HTTP ${txRes.status})`, status: 502 }
  }

  const txData = await txRes.json()
  const transactions = txData.results || []

  const balanceRes = await fetch(
    `${api}/data/v1/${resourceType}/${connection.truelayerAccountId}/balance`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (balanceRes.ok) {
    const balanceData = await balanceRes.json()
    const balanceResult = balanceData.results?.[0]
    const balance = balanceResult?.current
    const updateData: Record<string, any> = {}
    // Card `current` is the amount owed, stored as a negative balance
    if (balance !== undefined) updateData.balance = resourceType === 'cards' ? -balance : balance
    if (resourceType === 'cards' && balanceResult?.credit_limit !== undefined) {
      updateData.creditLimit = balanceResult.credit_limit
    }
    if (Object.keys(updateData).length > 0) {
      await db.bankAccount.update({ where: { id: accountId }, data: updateData })
    }
  }

  const existingTxs = await db.transaction.findMany({
    where: { accountId, importedFrom: { startsWith: 'truelayer:' } },
    select: { id: true, importedFrom: true, amount: true, type: true },
  })
  const existingById = new Map(existingTxs.map(t => [t.importedFrom, t]))

  const userCategories = await db.category.findMany({
    where: { userId: connection.userId },
    select: { id: true, name: true },
  })
  const categoryMap = new Map(userCategories.map(c => [c.name.toLowerCase(), c.id]))

  let imported = 0
  for (const tx of transactions) {
    const truelayerId = `truelayer:${tx.transaction_id}`
    const amount = signedAmount(tx, resourceType)
    const description = tx.description || tx.merchant_name || 'Bank transaction'
    const type = detectTransactionType(description, amount)

    const existing = existingById.get(truelayerId)
    if (existing) {
      if (existing.amount !== amount || existing.type !== type) {
        await db.transaction.update({ where: { id: existing.id }, data: { amount, type } })
      }
      continue
    }

    const detectedCategory = autoDetectCategory(description)
    const categoryId = categoryMap.get(detectedCategory.toLowerCase()) ?? null

    await db.transaction.create({
      data: {
        accountId,
        date: new Date(tx.timestamp),
        description: description.slice(0, 200),
        amount,
        type,
        ...(categoryId ? { categoryId } : {}),
        importedFrom: truelayerId,
        notes: tx.merchant_name ? `Merchant: ${tx.merchant_name}` : undefined,
      },
    })
    imported++
  }

  await db.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  })

  return { success: true, imported, total: transactions.length }
}
