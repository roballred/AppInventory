import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import { getStalenessThresholds } from '@/lib/business-rules'
import { computeRiskDashboard } from '@/lib/risk-dashboard'
import { DEV_USERS } from '@/lib/auth/dev-users'
import RiskCategorySection from './RiskCategorySection'

// ─── Risk Dashboard page ──────────────────────────────────────────────────────
// Only agency_admin can access — all others redirect to /dashboard

export default async function RiskDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any

  // Only agency_admin can view this page
  if (user.role !== 'agency_admin') {
    redirect('/dashboard')
  }

  const agencyId: string | null = user.agencyId ?? null
  const agencyName: string | null = user.agencyName ?? null

  if (!agencyId) {
    redirect('/dashboard')
  }

  const thresholds = await getStalenessThresholds()
  const riskData = await computeRiskDashboard(agencyId, thresholds)

  // Determine if any items are unverified (only applies to flag-based categories)
  const hasUnverified =
    riskData.aging.some((item) => item.isUnverified) ||
    riskData.unsupported.some((item) => item.isUnverified) ||
    riskData.ai.some((item) => item.isUnverified)

  // Build the agency users list for the assign dropdown
  // In dev mode (AUTH_BYPASS=true), use DEV_USERS filtered to the agency
  // TODO: In production, look up agency users from the database or identity provider
  const isDevMode = process.env.AUTH_BYPASS === 'true'
  const agencyUsers = isDevMode
    ? DEV_USERS
        .filter((u) => u.agencyId === agencyId)
        .map((u) => ({ id: u.id, email: u.email, name: u.name }))
    : [] // TODO: Replace with real agency user lookup

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Dashboard</h1>
        {agencyName && (
          <p className="text-sm text-gray-500 mt-0.5">{agencyName}</p>
        )}
      </div>

      {/* Unverified data quality warning */}
      {hasUnverified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Some risk flags have never been explicitly reviewed since record creation.
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Items marked <span className="font-medium">Unverified</span> may not reflect the current state
            of the application. Assign them to a team member for verification.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Aging Technology</p>
          <p className={`text-3xl font-bold mt-1 ${riskData.aging.length > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
            {riskData.aging.length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unsupported Versions</p>
          <p className={`text-3xl font-bold mt-1 ${riskData.unsupported.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {riskData.unsupported.length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">AI-Enabled</p>
          <p className={`text-3xl font-bold mt-1 ${riskData.ai.length > 0 ? 'text-blue-700' : 'text-gray-900'}`}>
            {riskData.ai.length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Approaching Staleness</p>
          <p className={`text-3xl font-bold mt-1 ${riskData.approachingStaleness.length > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
            {riskData.approachingStaleness.length}
          </p>
        </div>
      </div>

      {/* Risk category sections */}
      <RiskCategorySection
        title="Aging Technology"
        description="Applications flagged as aging legacy systems or running unsupported OS versions. These represent elevated technical risk and may require modernization planning."
        items={riskData.aging}
        agencyUsers={agencyUsers}
      />

      <RiskCategorySection
        title="Unsupported Versions"
        description="Applications where the vendor no longer provides patches or support. These carry security and compliance risk and should be prioritized for updates or replacement."
        items={riskData.unsupported}
        agencyUsers={agencyUsers}
      />

      <RiskCategorySection
        title="AI-Enabled Applications"
        description="Applications with AI or generative AI flags. Shown for awareness and policy compliance — verify that AI use is appropriately documented and approved."
        items={riskData.ai}
        agencyUsers={agencyUsers}
      />

      <RiskCategorySection
        title="Approaching Staleness"
        description="Records currently at warning level that will become critically stale within 30 days. Resolve these now to avoid certification blockers."
        items={riskData.approachingStaleness}
        agencyUsers={agencyUsers}
      />
    </div>
  )
}
