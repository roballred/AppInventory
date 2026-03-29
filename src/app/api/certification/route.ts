import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { eq, count } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, certifications } from '@/lib/db/schema'
import {
  getCertification,
  getCertificationDeadline,
  getCriticalStaleCount,
  getCurrentCertificationYear,
} from '@/lib/certification'
import { getStalenessThresholds } from '@/lib/business-rules'

// ─── GET /api/certification ───────────────────────────────────────────────────
// Returns the current year's certification for the agency, plus metadata.

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  if (user.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyId = user.agencyId as string
  const year = await getCurrentCertificationYear()
  const deadline = await getCertificationDeadline(year)
  const thresholds = await getStalenessThresholds()

  const certification = await getCertification(agencyId, year)
  const criticalStaleCount = await getCriticalStaleCount(agencyId, thresholds)

  const [{ value: totalApps }] = await db
    .select({ value: count() })
    .from(applications)
    .where(eq(applications.agencyId, agencyId))

  return NextResponse.json({
    certification,
    year,
    deadline: deadline.toISOString(),
    criticalStaleCount,
    totalApps: Number(totalApps),
  })
}

// ─── POST /api/certification ──────────────────────────────────────────────────
// Starts a new certification for the current year.

export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  if (user.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyId = user.agencyId as string
  const year = await getCurrentCertificationYear()

  // Check if already exists
  const existing = await getCertification(agencyId, year)
  if (existing) {
    return NextResponse.json(
      { error: `Certification for ${year} already exists` },
      { status: 409 }
    )
  }

  const now = new Date()

  const [created] = await db
    .insert(certifications)
    .values({
      agencyId,
      year,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
