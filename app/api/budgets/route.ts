import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { startOfMonth, endOfMonth } from 'date-fns'

const budgetSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [budgets, categories, spent] = await Promise.all([
    db.budget.findMany({
      where: { userId: session.user.id },
      include: { category: true },
    }),
    db.category.findMany({ where: { userId: session.user.id } }),
    db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: { userId: session.user.id },
        date: { gte: monthStart, lte: monthEnd },
        type: 'EXPENSE',
      },
      _sum: { amount: true },
    }),
  ])

  const spentMap: Record<string, number> = {}
  for (const s of spent) {
    if (s.categoryId) spentMap[s.categoryId] = Math.abs(s._sum.amount ?? 0)
  }

  const enriched = budgets.map(b => ({
    ...b,
    spent: spentMap[b.categoryId] ?? 0,
    remaining: b.amount - (spentMap[b.categoryId] ?? 0),
    percentUsed: Math.round(((spentMap[b.categoryId] ?? 0) / b.amount) * 100),
  }))

  return NextResponse.json({ budgets: enriched, categories })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = budgetSchema.parse(body)

    const budget = await db.budget.upsert({
      where: { userId_categoryId: { userId: session.user.id, categoryId: data.categoryId } },
      update: { amount: data.amount },
      create: { userId: session.user.id, ...data },
      include: { category: true },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  if (!categoryId) return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 })

  await db.budget.deleteMany({ where: { userId: session.user.id, categoryId } })
  return NextResponse.json({ success: true })
}
