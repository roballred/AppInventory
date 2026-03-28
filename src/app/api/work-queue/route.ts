import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { workQueueDismissals } from '@/lib/db/schema'
import { getStalenessThresholds } from '@/lib/business-rules'
import { computeWorkQueue } from '@/lib/work-queue'
import type { QueueItemReason } from '@/lib/work-queue'

// ─── GET /api/work-queue ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const role: string = user.role ?? ''

  // Only submitters and agency_admins have a work queue
  if (role !== 'submitter' && role !== 'agency_admin') {
    return NextResponse.json({ items: [] })
  }

  const agencyId: string | null = user.agencyId ?? null
  if (!agencyId) {
    return NextResponse.json({ error: 'No agency assigned to this user' }, { status: 400 })
  }

  const userId: string = user.email ?? user.id ?? 'unknown'

  const thresholds = await getStalenessThresholds()
  const items = await computeWorkQueue(agencyId, userId, thresholds)

  return NextResponse.json({ items })
}

// ─── POST /api/work-queue ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const role: string = user.role ?? ''

  if (role !== 'submitter' && role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { applicationId?: string; reason?: QueueItemReason }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { applicationId, reason } = body

  if (!applicationId || typeof applicationId !== 'string') {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
  }

  const validReasons: QueueItemReason[] = ['critical', 'warning', 'missing_fields', 'unverified_risk']
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json({ error: 'reason must be one of: critical, warning, missing_fields, unverified_risk' }, { status: 400 })
  }

  const userId: string = user.email ?? user.id ?? 'unknown'

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(workQueueDismissals).values({
    userId,
    applicationId,
    reason,
    dismissedAt: now,
    expiresAt,
  })

  return NextResponse.json({ success: true })
}
