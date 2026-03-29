import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { getStalenessThresholds } from '@/lib/business-rules'
import { computeRiskDashboard } from '@/lib/risk-dashboard'

// ─── GET /api/risk-dashboard ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any
  const role: string = user.role ?? ''

  // Only agency_admin and platform_admin can access the risk dashboard
  if (role !== 'agency_admin' && role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let agencyId: string | null = null

  if (role === 'agency_admin') {
    // agency_admin uses their own agencyId from session
    agencyId = user.agencyId ?? null
    if (!agencyId) {
      return NextResponse.json({ error: 'No agency assigned to this user' }, { status: 400 })
    }
  } else {
    // platform_admin requires agencyId query param
    const { searchParams } = new URL(request.url)
    agencyId = searchParams.get('agencyId')
    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId query parameter is required for platform_admin' }, { status: 400 })
    }
  }

  const thresholds = await getStalenessThresholds()
  const data = await computeRiskDashboard(agencyId, thresholds)

  return NextResponse.json(data)
}
