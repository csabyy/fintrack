import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const dayOfMonth = z.number().int().min(1).max(31)

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  bankName: z.string().min(1).max(100),
  type: z.enum(['CURRENT', 'CREDIT_CARD']).default('CURRENT'),
  color: z.string().default('#1E4C8A'),
  notes: z.string().max(500).optional().nullable(),
  promoEndDate: z.iso.date().optional().nullable(),
  creditLimit: z.number().positive().optional().nullable(),
  statementDay: dayOfMonth.optional().nullable(),
  paymentDueDay: dayOfMonth.optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await db.bankAccount.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { transactions: true } },
      transactions: {
        orderBy: { date: 'desc' },
        take: 5,
        include: { category: true },
      },
      bankConnection: {
        select: { lastSyncedAt: true, lastSyncAttemptAt: true, lastSyncError: true, logoUri: true, accountType: true, createdAt: true, consentExpiresAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { promoEndDate, statementDay, paymentDueDay, creditLimit, ...data } = accountSchema.parse(body)
    const isCard = data.type === 'CREDIT_CARD'

    const account = await db.bankAccount.create({
      data: {
        ...data,
        // Card-only fields are ignored for current accounts
        promoEndDate: isCard && promoEndDate ? new Date(promoEndDate) : null,
        statementDay: isCard ? statementDay ?? null : null,
        paymentDueDay: isCard ? paymentDueDay ?? null : null,
        creditLimit: isCard ? creditLimit ?? null : null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
