import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const month = searchParams.get('month') // YYYY-MM

  const where: any = { account: { userId: session.user.id } }
  if (accountId) where.accountId = accountId
  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  const transactions = await db.transaction.findMany({
    where,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true, bankName: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Build CSV
  const headers = ['Date', 'Description', 'Amount (GBP)', 'Type', 'Category', 'Account', 'Bank', 'Notes']
  const rows = transactions.map(t => [
    format(new Date(t.date), 'yyyy-MM-dd'),
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.type,
    t.category?.name ?? 'Uncategorized',
    `"${t.account.name}"`,
    `"${t.account.bankName}"`,
    `"${(t.notes ?? '').replace(/"/g, '""')}"`,
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const filename = `fintrack-export-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
