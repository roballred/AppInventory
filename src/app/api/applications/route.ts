import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, ilike, asc, lt, count } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, applicationAuditLog } from '@/lib/db/schema'
import type { LifecycleStatus, BusinessCriticality, CoreBusinessFunction } from '@/lib/db/schema'
import { canEditApplication, canViewApplications, getAgencyFilter } from '@/lib/permissions'
import { getStaleness, getDaysSinceReview, STALENESS_THRESHOLDS } from '@/lib/staleness'
import { getStalenessThresholds } from '@/lib/business-rules'

// ─── GET /api/applications ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canViewApplications(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const lifecycleStatusParam = searchParams.get('lifecycleStatus') as LifecycleStatus | null
  const stalenessParam = searchParams.get('staleness') // 'warning' | 'critical'
  const aiEnabledParam = searchParams.get('aiEnabled') // 'true' | 'false'
  const vendorParam = searchParams.get('vendor')
  const searchParam = searchParams.get('search')

  // Pagination params
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSizeParam = Math.min(parseInt(searchParams.get('pageSize') ?? '25', 10), 100)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 25

  const agencyFilter = getAgencyFilter(session)

  // Fetch thresholds from DB (with fallback to defaults)
  const thresholds = await getStalenessThresholds()

  // Build where conditions
  const conditions = []

  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  if (lifecycleStatusParam) {
    conditions.push(eq(applications.lifecycleStatus, lifecycleStatusParam))
  }

  if (vendorParam) {
    conditions.push(ilike(applications.manufacturerVendor, `%${vendorParam}%`))
  }

  if (searchParam) {
    conditions.push(ilike(applications.name, `%${searchParam}%`))
  }

  if (aiEnabledParam === 'true') {
    conditions.push(eq(applications.isAiEnabled, true))
  } else if (aiEnabledParam === 'false') {
    conditions.push(eq(applications.isAiEnabled, false))
  }

  // Apply staleness filter at the DB level
  if (stalenessParam === 'critical') {
    const cutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)
    conditions.push(lt(applications.lastReviewedAt, cutoff))
  } else if (stalenessParam === 'warning') {
    const warnCutoff = new Date(Date.now() - thresholds.warning * 24 * 60 * 60 * 1000)
    const critCutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)
    conditions.push(lt(applications.lastReviewedAt, warnCutoff))
    // Exclude critical records from warning filter so warning means warning-only
    // Actually staleness=warning should return all stale (warning + critical) per UI intent
    // but to match the original behavior (warning = >=90 days) we include all stale records
    // past warning threshold. Remove the critical exclusion to match original filter semantics.
    void critCutoff
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Count total matching rows
  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(applications)
    .where(whereClause)

  const total = Number(totalCount)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select()
    .from(applications)
    .where(whereClause)
    .orderBy(asc(applications.lastReviewedAt))
    .limit(pageSize)
    .offset(offset)

  // Compute staleness
  const data = rows.map((app) => {
    const level = getStaleness(app.lastReviewedAt, thresholds)
    const daysAgo = getDaysSinceReview(app.lastReviewedAt)
    return { ...app, staleness: level, daysSinceReview: daysAgo }
  })

  return NextResponse.json({ data, total, page, pageSize })
}

// ─── POST /api/applications ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canEditApplication(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate all required fields
  const requiredFields: Array<{ key: string; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'lifecycleStatus', label: 'Lifecycle Status' },
    { key: 'version', label: 'Version' },
    { key: 'manufacturerVendor', label: 'Manufacturer / Vendor' },
    { key: 'technicalOwner', label: 'Technical Owner' },
    { key: 'inServiceDate', label: 'In Service Date' },
  ]

  const missingFields = requiredFields.filter(({ key }) => {
    const val = body[key]
    return val === undefined || val === null || (typeof val === 'string' && !val.trim())
  })

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        error: `The following required fields are missing: ${missingFields.map((f) => f.label).join(', ')}.`,
      },
      { status: 400 }
    )
  }

  const user = session.user as any
  const agencyFilter = getAgencyFilter(session)

  // Agency-scoped users get their agency from the session; platform_admin must provide it in body
  let agencyId: string
  if (agencyFilter !== null) {
    agencyId = agencyFilter
  } else {
    if (!body.agencyId || typeof body.agencyId !== 'string') {
      return NextResponse.json(
        { error: 'agencyId is required for platform_admin' },
        { status: 400 }
      )
    }
    agencyId = body.agencyId as string
  }

  const now = new Date()

  const [created] = await db
    .insert(applications)
    .values({
      agencyId,
      name: (body.name as string).trim(),
      description: (body.description as string | undefined) ?? null,
      version: (body.version as string | undefined) ?? null,
      lifecycleStatus: body.lifecycleStatus as LifecycleStatus,
      manufacturerVendor: (body.manufacturerVendor as string | undefined) ?? null,
      cloudServiceProvider: (body.cloudServiceProvider as string | undefined) ?? null,
      operatingSystem: (body.operatingSystem as string | undefined) ?? null,
      osVersion: (body.osVersion as string | undefined) ?? null,
      contractNumber: (body.contractNumber as string | undefined) ?? null,
      licenseNumber: (body.licenseNumber as string | undefined) ?? null,
      technicalOwner: (body.technicalOwner as string | undefined) ?? null,
      technicalOwnerEmail: (body.technicalOwnerEmail as string | undefined) ?? null,
      inServiceDate: (body.inServiceDate as string | undefined) ?? null,
      retirementDate: (body.retirementDate as string | undefined) ?? null,
      isUnsupportedVersion: (body.isUnsupportedVersion as boolean | undefined) ?? false,
      isUpdatable: (body.isUpdatable as boolean | undefined) ?? true,
      isAgingTechnology: (body.isAgingTechnology as boolean | undefined) ?? false,
      isAiEnabled: (body.isAiEnabled as boolean | undefined) ?? false,
      isGenerativeAi: (body.isGenerativeAi as boolean | undefined) ?? false,
      businessCriticality: (body.businessCriticality as BusinessCriticality | undefined) ?? null,
      coreBusinessFunction:
        (body.coreBusinessFunction as CoreBusinessFunction | undefined) ?? null,
      riskFieldsLastVerifiedAt: null,
      lastReviewedAt: now,
      createdAt: now,
      updatedAt: now,
      createdById: user.email ?? user.id ?? 'unknown',
      updatedById: user.email ?? user.id ?? 'unknown',
    })
    .returning()

  // Audit log — capture all non-null field values as { old: null, new: value }
  await db.insert(applicationAuditLog).values({
    applicationId: created.id,
    userId: user.email ?? user.id ?? 'unknown',
    userEmail: user.email ?? 'unknown',
    action: 'created',
    changedFields: Object.fromEntries(
      Object.entries(created)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, { old: null, new: v }])
    ),
  })

  return NextResponse.json(created, { status: 201 })
}
