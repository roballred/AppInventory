import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, isNull, or, desc, count } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'

// GET /api/notifications
// Query params: unreadOnly=true, limit=N (default 20)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const agencyId: string | null = user.agencyId ?? null
  const userId: string = user.email ?? user.id ?? 'unknown'

  if (!agencyId) {
    // Platform admin — no personal notifications
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }

  const { searchParams } = request.nextUrl
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  // Show: broadcast notifications for this agency + targeted notifications for this user
  const scopeCondition = or(
    and(eq(notifications.agencyId, agencyId), isNull(notifications.userId)),
    eq(notifications.userId, userId)
  )

  const baseCondition = unreadOnly
    ? and(scopeCondition, isNull(notifications.readAt))
    : scopeCondition

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(baseCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(scopeCondition, isNull(notifications.readAt))),
  ])

  return NextResponse.json({
    notifications: items,
    unreadCount: Number(countResult[0]?.value ?? 0),
  })
}
