import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { eq, lt, and } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import type { LifecycleStatus } from '@/lib/db/schema'
import {
  getCertification,
  getCertificationDeadline,
  getCriticalStaleApplications,
  getCurrentCertificationYear,
} from '@/lib/certification'
import { getStalenessThresholds } from '@/lib/business-rules'
import CertificationWorkflow from './CertificationWorkflow'

export default async function CertificationPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'agency_admin') {
    redirect('/dashboard')
  }

  const agencyId = user.agencyId as string
  const agencyName = (user.agencyName as string) ?? 'your agency'

  const year = await getCurrentCertificationYear()
  const deadline = await getCertificationDeadline(year)
  const thresholds = await getStalenessThresholds()

  const certification = await getCertification(agencyId, year)
  const criticalStaleApps = await getCriticalStaleApplications(agencyId, thresholds)

  // Fetch all apps for this agency
  const allApps = await db
    .select()
    .from(applications)
    .where(eq(applications.agencyId, agencyId))

  const totalApps = allApps.length

  // Compute warning count (warning-only, not critical)
  const warningCutoff = new Date(Date.now() - thresholds.warning * 24 * 60 * 60 * 1000)
  const criticalCutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)

  let warningCount = 0
  for (const app of allApps) {
    if (app.lastReviewedAt < criticalCutoff) continue // critical, not warning
    if (app.lastReviewedAt < warningCutoff) warningCount++
  }

  // Lifecycle breakdown
  const lifecycleCounts: Record<string, number> = {}
  for (const app of allApps) {
    const status = app.lifecycleStatus as LifecycleStatus
    lifecycleCounts[status] = (lifecycleCounts[status] ?? 0) + 1
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Annual Certification</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {agencyName} &mdash; {year}
        </p>
      </div>

      <CertificationWorkflow
        certification={certification}
        year={year}
        deadline={deadline.toISOString()}
        totalApps={totalApps}
        criticalStaleApps={criticalStaleApps}
        warningCount={warningCount}
        lifecycleCounts={lifecycleCounts}
        agencyName={agencyName}
      />
    </div>
  )
}
