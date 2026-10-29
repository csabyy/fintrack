import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isBankSyncEnabled, truelayerHosts, truelayerProviders, redirectUri } from '@/lib/truelayer'

export async function GET(req: NextRequest) {
  if (!isBankSyncEnabled()) {
    return NextResponse.json({ error: 'Bank sync is not configured on this server' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const account = await db.bankAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Store accountId in state so we know which account to link after OAuth
  const state = Buffer.from(JSON.stringify({ accountId, userId: session.user.id })).toString('base64')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    scope: 'info accounts balance cards transactions offline_access',
    redirect_uri: redirectUri(),
    providers: truelayerProviders(),
    state,
  })

  return NextResponse.redirect(`${truelayerHosts().auth}/?${params.toString()}`)
}
