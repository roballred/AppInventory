import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { generateAllNotifications } from '@/lib/notifications'
import { logger } from '@/lib/logger'

// POST /api/notifications/generate
// Platform admin only. Triggers notification generation for all agencies.
// In production this would be called by a cron job or scheduler.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const results = await generateAllNotifications()
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    logger.error('api.notifications.generate', 'Generation failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Notification generation failed' }, { status: 500 })
  }
}
