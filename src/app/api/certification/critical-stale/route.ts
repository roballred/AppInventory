import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { getCriticalStaleApplications, getCurrentCertificationYear } from '@/lib/certification'
import { getStalenessThresholds } from '@/lib/business-rules'

// GET /api/certification/critical-stale
// Returns the live list of critically stale non-retired applications for the agency.
// Used by CertificationWorkflow to refresh the stale count without a full page reload.

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  if (user.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agencyId = user.agencyId as string
  const thresholds = await getStalenessThresholds()
  const criticalStaleApps = await getCriticalStaleApplications(agencyId, thresholds)

  return NextResponse.json({ criticalStaleApps })
}
