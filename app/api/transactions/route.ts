import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const month = searchParams.get('month') // YYYY-MM
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build where clause
  const where: Record<string, unknown> = {
    account: { userId: session.user.id },
  }

  if (accountId) where.accountId = accountId

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    where.date = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    }
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        category: true,
        account: { select: { id: true, name: true, color: true } },
        transferTo: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total })
}
