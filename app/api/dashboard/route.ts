import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountIdsParam = searchParams.get('accountIds') // comma-separated, optional
  const selectedIds = accountIdsParam ? accountIdsParam.split(',').filter(Boolean) : null

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Always fetch ALL accounts so the toggle list is always complete
  const accounts = await db.bankAccount.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, balance: true, color: true, bankName: true },
    orderBy: { createdAt: 'asc' },
  })

  // Account filter: if selectedIds provided use them, else all
  const accountFilter = selectedIds
    ? { userId: session.user.id, id: { in: selectedIds } }
    : { userId: session.user.id }

  const [currentMonthTx, recentTx, categorySummary] = await Promise.all([
    db.transaction.findMany({
      where: {
        account: accountFilter,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { amount: true, type: true },
    }),

    db.transaction.findMany({
      where: { account: accountFilter },
      include: {
        category: true,
        account: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),

    db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: accountFilter,
        date: { gte: monthStart, lte: monthEnd },
        type: 'EXPENSE',
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  // ── Monthly income/expenses (filtered) ───────────────────────────────────
  let monthlyIncome = 0
  let monthlyExpenses = 0
  for (const t of currentMonthTx) {
    if (t.type === 'INCOME') monthlyIncome += t.amount
    else if (t.type === 'EXPENSE') monthlyExpenses += Math.abs(t.amount)
  }

  // ── 6-month chart (filtered) ─────────────────────────────────────────────
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(now, 5 - i)
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      return db.transaction.findMany({
        where: { account: accountFilter, date: { gte: start, lte: end } },
        select: { amount: true, type: true },
      }).then(txs => ({
        month: format(date, 'MMM'),
        income: txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expenses: txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0),
      }))
    })
  )

  // ── Category breakdown (filtered) ─────────────────────────────────────
  const categoryIds = categorySummary.map(c => c.categoryId).filter(Boolean) as string[]
  const categories = await db.category.findMany({ where: { id: { in: categoryIds } } })
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const enrichedCategories = categorySummary
    .filter(c => c._sum.amount !== null)
    .map(c => ({
      name: c.categoryId ? catMap[c.categoryId]?.name ?? 'Unknown' : 'Uncategorized',
      color: c.categoryId ? catMap[c.categoryId]?.color ?? '#7B8592' : '#7B8592',
      icon: c.categoryId ? catMap[c.categoryId]?.icon ?? '📦' : '📦',
      total: Math.abs(c._sum.amount!),
      count: c._count.id,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  return NextResponse.json({
    accounts,                      // always all accounts
    monthlyIncome,                 // filtered
    monthlyExpenses,               // filtered
    recentTransactions: recentTx,  // filtered
    monthlyData,                   // filtered
    categoryBreakdown: enrichedCategories, // filtered
  })
}
