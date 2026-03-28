import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { eq, and } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import type { LifecycleStatus } from '@/lib/db/schema'
import { getStaleness } from '@/lib/staleness'
import { getAgencyFilter, canEditApplication } from '@/lib/permissions'

const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  in_development: 'In Development',
  in_production: 'In Production',
  retirement_in_progress: 'Retirement in Progress',
  retired_from_inventory: 'Retired from Inventory',
}

const LIFECYCLE_STATUS_ORDER: LifecycleStatus[] = [
  'in_production',
  'in_development',
  'retirement_in_progress',
  'retired_from_inventory',
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  const agencyFilter = getAgencyFilter(session)
  const canEdit = canEditApplication(session)
  const isPlatformAdmin = user.role === 'platform_admin'

  // Fetch all relevant applications
  const rows = agencyFilter
    ? await db
        .select()
        .from(applications)
        .where(eq(applications.agencyId, agencyFilter))
    : await db.select().from(applications)

  // Compute summary statistics
  const total = rows.length

  let warning = 0
  let critical = 0

  for (const app of rows) {
    const level = getStaleness(app.lastReviewedAt)
    if (level === 'warning') warning++
    else if (level === 'critical') critical++
  }

  const stale = warning + critical

  // Lifecycle breakdown
  const lifecycleCounts: Partial<Record<LifecycleStatus, number>> = {}
  for (const app of rows) {
    lifecycleCounts[app.lifecycleStatus] =
      (lifecycleCounts[app.lifecycleStatus] ?? 0) + 1
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isPlatformAdmin ? 'Statewide Overview' : 'Agency Dashboard'}
        </h1>
        {user.agencyName && (
          <p className="text-sm text-gray-500 mt-0.5">{user.agencyName}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Applications</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Stale Records</p>
          <p className={`text-3xl font-bold mt-1 ${stale > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
            {stale}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Critical Stale</p>
          <p className={`text-3xl font-bold mt-1 ${critical > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {critical}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Warning Stale</p>
          <p className={`text-3xl font-bold mt-1 ${warning > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {warning}
          </p>
        </div>
      </div>

      {/* Lifecycle breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            By Lifecycle Status
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {LIFECYCLE_STATUS_ORDER.map((status) => {
            const count = lifecycleCounts[status] ?? 0
            return (
              <div key={status} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-700">{LIFECYCLE_LABELS[status]}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alerts */}
      {critical > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-red-800">
            {critical} application{critical !== 1 ? 's' : ''} are critically stale (180+ days).
          </p>
          <p className="text-sm text-red-700 mt-1">
            Critically stale records must be resolved before annual certification can be submitted.
          </p>
          <Link
            href="/dashboard/applications?staleness=critical"
            className="inline-block mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
          >
            Review critical records
          </Link>
        </div>
      )}

      {warning > 0 && critical === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-yellow-800">
            {warning} application{warning !== 1 ? 's' : ''} have not been reviewed in over 90 days.
          </p>
          <Link
            href="/dashboard/applications?staleness=warning"
            className="inline-block mt-2 text-sm font-medium text-yellow-700 underline hover:text-yellow-900"
          >
            Review stale records
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Quick Actions
          </h2>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3">
          {canEdit && (
            <Link
              href="/dashboard/applications/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Application
            </Link>
          )}
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            View All Applications
          </Link>
        </div>
      </div>
    </div>
  )
}
