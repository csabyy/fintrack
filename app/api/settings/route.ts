import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

const prefSchema = z.object({
  weekStartsOn: z.number().int().min(0).max(1).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, pref] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.userPreference.findUnique({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({ user, preference: pref })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'profile') {
      const data = profileSchema.parse(body)

      // Password change
      if (data.newPassword) {
        if (!data.currentPassword) {
          return NextResponse.json({ error: 'Current password required' }, { status: 400 })
        }
        const user = await db.user.findUnique({ where: { id: session.user.id } })
        const valid = await bcrypt.compare(data.currentPassword, user!.password)
        if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
        const hashed = await bcrypt.hash(data.newPassword, 12)
        await db.user.update({ where: { id: session.user.id }, data: { password: hashed } })
      }

      if (data.name) {
        await db.user.update({ where: { id: session.user.id }, data: { name: data.name } })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'preferences') {
      const data = prefSchema.parse(body)
      await db.userPreference.upsert({
        where: { userId: session.user.id },
        update: data,
        create: { userId: session.user.id, ...data },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
