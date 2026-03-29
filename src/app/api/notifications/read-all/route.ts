import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, isNull, or } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'

// PATCH /api/notifications/read-all — mark all as read for the current user
export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const agencyId: string | null = user.agencyId ?? null
  const userId: string = user.email ?? user.id ?? 'unknown'

  if (!agencyId) return NextResponse.json({ updated: 0 })

  const now = new Date()

  const updated = await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        or(
          and(eq(notifications.agencyId, agencyId), isNull(notifications.userId)),
          eq(notifications.userId, userId)
        ),
        isNull(notifications.readAt)
      )
    )
    .returning({ id: notifications.id })

  return NextResponse.json({ updated: updated.length })
}
