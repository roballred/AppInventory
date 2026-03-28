import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, ilike, asc } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, applicationAuditLog } from '@/lib/db/schema'
import type { LifecycleStatus } from '@/lib/db/schema'
import { canEditApplication, canViewApplications, getAgencyFilter } from '@/lib/permissions'
import { getStaleness, getDaysSinceReview } from '@/lib/staleness'

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

  const agencyFilter = getAgencyFilter(session)

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

  const rows = await db
    .select()
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(applications.lastReviewedAt))

  // Compute staleness and apply post-query staleness filter
  const results = rows
    .map((app) => {
      const level = getStaleness(app.lastReviewedAt)
      const daysAgo = getDaysSinceReview(app.lastReviewedAt)
      return { ...app, staleness: level, daysSinceReview: daysAgo }
    })
    .filter((app) => {
      if (!stalenessParam) return true
      return app.staleness === stalenessParam
    })

  return NextResponse.json(results)
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

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.lifecycleStatus) {
    return NextResponse.json({ error: 'lifecycleStatus is required' }, { status: 400 })
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
      name: body.name as string,
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
      inServiceDate: (body.inServiceDate as string | undefined) ?? null,
      retirementDate: (body.retirementDate as string | undefined) ?? null,
      isUnsupportedVersion: (body.isUnsupportedVersion as boolean | undefined) ?? false,
      isUpdatable: (body.isUpdatable as boolean | undefined) ?? true,
      isAgingTechnology: (body.isAgingTechnology as boolean | undefined) ?? false,
      isAiEnabled: (body.isAiEnabled as boolean | undefined) ?? false,
      isGenerativeAi: (body.isGenerativeAi as boolean | undefined) ?? false,
      riskFieldsLastVerifiedAt: null,
      lastReviewedAt: now,
      createdAt: now,
      updatedAt: now,
      createdById: user.email ?? user.id ?? 'unknown',
      updatedById: user.email ?? user.id ?? 'unknown',
    })
    .returning()

  // Audit log
  await db.insert(applicationAuditLog).values({
    applicationId: created.id,
    userId: user.email ?? user.id ?? 'unknown',
    userEmail: user.email ?? 'unknown',
    action: 'created',
    changedFields: null,
  })

  return NextResponse.json(created, { status: 201 })
}
