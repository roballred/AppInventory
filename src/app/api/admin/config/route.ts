import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { businessRules } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

// GET /api/admin/config — return all business rules (platform_admin only)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rules = await db.select().from(businessRules)
  return NextResponse.json(rules)
}

// PUT /api/admin/config — update a single business rule (platform_admin only)
// Body: { key: string, value: string }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { key?: string; value?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { key, value } = body

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }
  if (value === undefined || value === null || typeof value !== 'string') {
    return NextResponse.json({ error: 'value is required' }, { status: 400 })
  }

  // Whitelist — only allow known keys to be edited
  const ALLOWED_KEYS = [
    'staleness_warning_days',
    'staleness_critical_days',
    'certification_reminder_days',
    'certification_deadline_month',
    'certification_deadline_day',
  ]
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: `Unknown config key "${key}"` }, { status: 400 })
  }

  // Validate the value is a positive integer
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return NextResponse.json(
      { error: `Value must be a positive integer, got "${value}"` },
      { status: 400 }
    )
  }

  // Additional range validation per key
  if (key === 'certification_deadline_month' && (parsed < 1 || parsed > 12)) {
    return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 })
  }
  if (key === 'certification_deadline_day' && (parsed < 1 || parsed > 31)) {
    return NextResponse.json({ error: 'Day must be between 1 and 31' }, { status: 400 })
  }
  if (key === 'staleness_warning_days' || key === 'staleness_critical_days') {
    if (parsed > 3650) {
      return NextResponse.json({ error: 'Staleness threshold cannot exceed 3650 days (10 years)' }, { status: 400 })
    }
  }

  // If updating warning, ensure warning < critical (fetch current critical to compare)
  if (key === 'staleness_warning_days') {
    const [criticalRow] = await db
      .select()
      .from(businessRules)
      .where(eq(businessRules.key, 'staleness_critical_days'))
    const critical = criticalRow ? parseInt(criticalRow.value, 10) : 180
    if (parsed >= critical) {
      return NextResponse.json(
        { error: `Warning threshold (${parsed}) must be less than critical threshold (${critical})` },
        { status: 400 }
      )
    }
  }

  // If updating critical, ensure critical > warning
  if (key === 'staleness_critical_days') {
    const [warningRow] = await db
      .select()
      .from(businessRules)
      .where(eq(businessRules.key, 'staleness_warning_days'))
    const warning = warningRow ? parseInt(warningRow.value, 10) : 90
    if (parsed <= warning) {
      return NextResponse.json(
        { error: `Critical threshold (${parsed}) must be greater than warning threshold (${warning})` },
        { status: 400 }
      )
    }
  }

  const userId = user.email ?? user.id ?? 'unknown'
  const now = new Date()

  const [updated] = await db
    .update(businessRules)
    .set({ value, updatedAt: now, updatedById: userId })
    .where(eq(businessRules.key, key))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: `Config key "${key}" not found` }, { status: 404 })
  }

  logger.info('api.admin.config', `Business rule updated`, { key, value, userId })

  return NextResponse.json(updated)
}
