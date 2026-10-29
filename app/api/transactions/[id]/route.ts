import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: session.user.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  await db.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
