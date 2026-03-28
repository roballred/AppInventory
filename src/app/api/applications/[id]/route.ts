import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, desc } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, applicationAuditLog } from '@/lib/db/schema'
import type { LifecycleStatus, BusinessCriticality, CoreBusinessFunction } from '@/lib/db/schema'
import {
  canEditApplication,
  canRetireApplication,
  canViewApplications,
  getAgencyFilter,
} from '@/lib/permissions'
import { getStaleness, getDaysSinceReview } from '@/lib/staleness'
import { getStalenessThresholds } from '@/lib/business-rules'

const RISK_FLAG_FIELDS = [
  'isUnsupportedVersion',
  'isUpdatable',
  'isAgingTechnology',
  'isAiEnabled',
  'isGenerativeAi',
] as const

type RiskFlagField = (typeof RISK_FLAG_FIELDS)[number]

// ─── GET /api/applications/[id] ──────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canViewApplications(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyFilter = getAgencyFilter(session)

  const conditions = [eq(applications.id, params.id)]
  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  const [app] = await db
    .select()
    .from(applications)
    .where(and(...conditions))

  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const auditLog = await db
    .select()
    .from(applicationAuditLog)
    .where(eq(applicationAuditLog.applicationId, params.id))
    .orderBy(desc(applicationAuditLog.createdAt))

  const thresholds = await getStalenessThresholds()
  const staleness = getStaleness(app.lastReviewedAt, thresholds)
  const daysSinceReview = getDaysSinceReview(app.lastReviewedAt)

  return NextResponse.json({ ...app, staleness, daysSinceReview, auditLog })
}

// ─── PUT /api/applications/[id] ──────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canEditApplication(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyFilter = getAgencyFilter(session)

  // Fetch existing record (with agency scope enforcement)
  const conditions = [eq(applications.id, params.id)]
  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  const [existing] = await db
    .select()
    .from(applications)
    .where(and(...conditions))

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const user = session.user as any
  const now = new Date()

  // Only update riskFieldsLastVerifiedAt when the user explicitly signals review
  const riskFlagsVerified = body.riskFlagsVerified === true

  // Build changed fields map for audit log
  const changedFields: Record<string, { old: unknown; new: unknown }> = {}
  const updatable = [
    'name',
    'description',
    'version',
    'lifecycleStatus',
    'manufacturerVendor',
    'cloudServiceProvider',
    'operatingSystem',
    'osVersion',
    'contractNumber',
    'licenseNumber',
    'technicalOwner',
    'technicalOwnerEmail',
    'inServiceDate',
    'retirementDate',
    'isUnsupportedVersion',
    'isUpdatable',
    'isAgingTechnology',
    'isAiEnabled',
    'isGenerativeAi',
    'businessCriticality',
    'coreBusinessFunction',
  ] as const

  type UpdatableField = (typeof updatable)[number]

  // Map camelCase keys to DB keys for comparison
  const dbFieldMap: Record<UpdatableField, keyof typeof existing> = {
    name: 'name',
    description: 'description',
    version: 'version',
    lifecycleStatus: 'lifecycleStatus',
    manufacturerVendor: 'manufacturerVendor',
    cloudServiceProvider: 'cloudServiceProvider',
    operatingSystem: 'operatingSystem',
    osVersion: 'osVersion',
    contractNumber: 'contractNumber',
    licenseNumber: 'licenseNumber',
    technicalOwner: 'technicalOwner',
    technicalOwnerEmail: 'technicalOwnerEmail',
    inServiceDate: 'inServiceDate',
    retirementDate: 'retirementDate',
    isUnsupportedVersion: 'isUnsupportedVersion',
    isUpdatable: 'isUpdatable',
    isAgingTechnology: 'isAgingTechnology',
    isAiEnabled: 'isAiEnabled',
    isGenerativeAi: 'isGenerativeAi',
    businessCriticality: 'businessCriticality',
    coreBusinessFunction: 'coreBusinessFunction',
  }

  for (const field of updatable) {
    if (field in body) {
      const oldVal = existing[dbFieldMap[field]]
      const newVal = body[field]
      if (oldVal !== newVal) {
        changedFields[field] = { old: oldVal, new: newVal }
      }
    }
  }

  const updateData: Partial<typeof existing> & {
    updatedAt: Date
    lastReviewedAt: Date
    updatedById: string
    riskFieldsLastVerifiedAt?: Date | null
  } = {
    updatedAt: now,
    lastReviewedAt: now,
    updatedById: user.email ?? user.id ?? 'unknown',
  }

  if (riskFlagsVerified) {
    updateData.riskFieldsLastVerifiedAt = now
  }

  // Apply field updates
  for (const field of updatable) {
    if (field in body) {
      ;(updateData as Record<string, unknown>)[field] = body[field]
    }
  }

  const [updated] = await db
    .update(applications)
    .set(updateData as Parameters<typeof db.update>[0] extends infer T ? any : never)
    .where(and(...conditions))
    .returning()

  // Audit log entry
  await db.insert(applicationAuditLog).values({
    applicationId: params.id,
    userId: user.email ?? user.id ?? 'unknown',
    userEmail: user.email ?? 'unknown',
    action: 'updated',
    changedFields: Object.keys(changedFields).length > 0 ? changedFields : null,
  })

  return NextResponse.json(updated)
}

// ─── PATCH /api/applications/[id] ─────────────────────────────────────────────
// Body: { action: 'retire' | 'revert', previousLifecycleStatus?: string }

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canRetireApplication(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyFilter = getAgencyFilter(session)

  const conditions = [eq(applications.id, params.id)]
  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  const [existing] = await db
    .select()
    .from(applications)
    .where(and(...conditions))

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { action: 'retire' | 'revert'; previousLifecycleStatus?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.action || !['retire', 'revert'].includes(body.action)) {
    return NextResponse.json(
      { error: 'action must be "retire" or "revert"' },
      { status: 400 }
    )
  }

  const user = session.user as any
  const now = new Date()

  let newStatus: LifecycleStatus
  let auditAction: 'retired' | 'reverted'

  if (body.action === 'retire') {
    newStatus = 'retired_from_inventory'
    auditAction = 'retired'
  } else {
    // revert — previousLifecycleStatus is required
    if (!body.previousLifecycleStatus) {
      return NextResponse.json(
        { error: 'previousLifecycleStatus is required when action is "revert"' },
        { status: 400 }
      )
    }

    newStatus = body.previousLifecycleStatus as LifecycleStatus
    auditAction = 'reverted'
  }

  const [updated] = await db
    .update(applications)
    .set({
      lifecycleStatus: newStatus,
      lastReviewedAt: now,
      updatedAt: now,
      updatedById: user.email ?? user.id ?? 'unknown',
    })
    .where(and(...conditions))
    .returning()

  await db.insert(applicationAuditLog).values({
    applicationId: params.id,
    userId: user.email ?? user.id ?? 'unknown',
    userEmail: user.email ?? 'unknown',
    action: auditAction,
    changedFields: {
      lifecycleStatus: {
        old: existing.lifecycleStatus,
        new: newStatus,
      },
    },
  })

  return NextResponse.json(updated)
}
