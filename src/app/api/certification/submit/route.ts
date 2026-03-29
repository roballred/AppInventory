import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { and, eq, ne, count } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, certifications } from '@/lib/db/schema'
import {
  getCertification,
  getCriticalStaleApplications,
  getCriticalStaleCount,
  getCurrentCertificationYear,
} from '@/lib/certification'
import { getStalenessThresholds } from '@/lib/business-rules'
import { getDaysSinceReview } from '@/lib/staleness'

// ─── POST /api/certification/submit ──────────────────────────────────────────

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
  const thresholds = await getStalenessThresholds()

  // Certification must exist and be in a submittable status
  const certification = await getCertification(agencyId, year)
  if (!certification) {
    return NextResponse.json(
      { error: 'No certification found for this year. Start the certification first.' },
      { status: 422 }
    )
  }

  if (
    certification.status !== 'in_progress' &&
    certification.status !== 'revision_requested'
  ) {
    return NextResponse.json(
      {
        error: `Certification cannot be submitted in status "${certification.status}".`,
      },
      { status: 422 }
    )
  }

  // Validate: zero critical stale applications
  const criticalApps = await getCriticalStaleApplications(agencyId, thresholds)
  if (criticalApps.length > 0) {
    const blockers = criticalApps.map((app) => ({
      id: app.id,
      name: app.name,
      daysSinceReview: getDaysSinceReview(app.lastReviewedAt),
    }))
    return NextResponse.json(
      {
        error: `Cannot submit: ${criticalApps.length} critically stale record(s) must be resolved first.`,
        blockers,
      },
      { status: 422 }
    )
  }

  // Validate: at least 1 application record
  const [{ value: totalApps }] = await db
    .select({ value: count() })
    .from(applications)
    .where(eq(applications.agencyId, agencyId))

  const total = Number(totalApps)
  if (total < 1) {
    return NextResponse.json(
      { error: 'Cannot submit: agency must have at least 1 application record.' },
      { status: 422 }
    )
  }

  // Get final critical stale count (should be 0 here but capture it)
  const criticalStaleCount = await getCriticalStaleCount(agencyId, thresholds)

  const now = new Date()

  const [updated] = await db
    .update(certifications)
    .set({
      status: 'submitted',
      submittedAt: now,
      submittedById: user.id ?? user.email ?? 'unknown',
      submittedByEmail: user.email ?? 'unknown',
      recordCount: total,
      criticalStaleCount,
      updatedAt: now,
    })
    .where(
      and(
        eq(certifications.agencyId, agencyId),
        eq(certifications.year, year)
      )
    )
    .returning()

  return NextResponse.json(updated)
}
