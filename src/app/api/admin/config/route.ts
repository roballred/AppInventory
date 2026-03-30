import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { businessRules } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

// The 5 core rules that ship with the system and cannot be deleted
const CORE_KEYS = [
  'staleness_warning_days',
  'staleness_critical_days',
  'certification_reminder_days',
  'certification_deadline_month',
  'certification_deadline_day',
] as const

// Valid key format: lowercase letters, numbers, underscores; must start with a letter
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>> | null) {
  if (!session) return false
  const user = (session as any).user as any
  return user?.role === 'platform_admin'
}

// GET /api/admin/config — return all business rules (platform_admin only)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rules = await db.select().from(businessRules)
  return NextResponse.json(rules)
}

// POST /api/admin/config — create a new business rule (platform_admin only)
// Body: { key: string, value: string, description?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { key?: string; value?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { key, value, description } = body

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      { error: 'Key must be lowercase letters, numbers, and underscores only (e.g. my_rule_days)' },
      { status: 400 }
    )
  }
  if (key.length > 100) {
    return NextResponse.json({ error: 'Key must be 100 characters or fewer' }, { status: 400 })
  }
  if (value === undefined || value === null || typeof value !== 'string') {
    return NextResponse.json({ error: 'value is required' }, { status: 400 })
  }

  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return NextResponse.json({ error: 'Value must be a positive integer' }, { status: 400 })
  }
  if (parsed > 999999) {
    return NextResponse.json({ error: 'Value must be 999999 or less' }, { status: 400 })
  }

  // Check for duplicates
  const [existing] = await db.select().from(businessRules).where(eq(businessRules.key, key))
  if (existing) {
    return NextResponse.json({ error: `A rule with key "${key}" already exists` }, { status: 409 })
  }

  const user = session.user as any
  const userId = user.email ?? user.id ?? 'unknown'
  const now = new Date()

  const [created] = await db
    .insert(businessRules)
    .values({
      key,
      value,
      description: description?.trim() || null,
      updatedAt: now,
      updatedById: userId,
    })
    .returning()

  logger.info('api.admin.config', 'Business rule created', { key, value, userId })

  return NextResponse.json(created, { status: 201 })
}

// PUT /api/admin/config — update a single business rule (platform_admin only)
// Body: { key: string, value: string }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // Validate the value is a positive integer
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return NextResponse.json(
      { error: `Value must be a positive integer, got "${value}"` },
      { status: 400 }
    )
  }

  // Core-key-specific range validation
  if (key === 'certification_deadline_month' && (parsed < 1 || parsed > 12)) {
    return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 })
  }
  if (key === 'certification_deadline_day' && (parsed < 1 || parsed > 31)) {
    return NextResponse.json({ error: 'Day must be between 1 and 31' }, { status: 400 })
  }
  if (key === 'staleness_warning_days' || key === 'staleness_critical_days') {
    if (parsed > 3650) {
      return NextResponse.json(
        { error: 'Staleness threshold cannot exceed 3650 days (10 years)' },
        { status: 400 }
      )
    }
  }

  // Cross-field: warning < critical
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

  const user = session.user as any
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

  logger.info('api.admin.config', 'Business rule updated', { key, value, userId })

  return NextResponse.json(updated)
}

// DELETE /api/admin/config?key=my_rule — delete a custom rule (platform_admin only)
// Core rules cannot be deleted.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const key = req.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'key query parameter is required' }, { status: 400 })
  }

  if ((CORE_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json({ error: `"${key}" is a core rule and cannot be deleted` }, { status: 400 })
  }

  const [deleted] = await db
    .delete(businessRules)
    .where(eq(businessRules.key, key))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: `Rule "${key}" not found` }, { status: 404 })
  }

  const user = session.user as any
  const userId = user.email ?? user.id ?? 'unknown'
  logger.info('api.admin.config', 'Business rule deleted', { key, userId })

  return NextResponse.json({ deleted: true, key })
}
