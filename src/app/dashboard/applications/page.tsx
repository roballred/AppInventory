import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { eq, and, ilike, asc, lt, count } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import type { LifecycleStatus } from '@/lib/db/schema'
import { getStaleness, getDaysSinceReview } from '@/lib/staleness'
import { getStalenessThresholds } from '@/lib/business-rules'
import { getAgencyFilter, canEditApplication } from '@/lib/permissions'
import StalenessIndicator from '@/components/StalenessIndicator'
import clsx from 'clsx'

const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  in_development: 'In Development',
  in_production: 'In Production',
  retirement_in_progress: 'Retirement in Progress',
  retired_from_inventory: 'Retired from Inventory',
}

const LIFECYCLE_VALUES: LifecycleStatus[] = [
  'in_development',
  'in_production',
  'retirement_in_progress',
  'retired_from_inventory',
]

const PAGE_SIZE = 25

interface SearchParams {
  lifecycleStatus?: string
  staleness?: string
  aiEnabled?: string
  search?: string
  vendor?: string
  page?: string
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const canEdit = canEditApplication(session)
  const agencyFilter = getAgencyFilter(session)

  const thresholds = await getStalenessThresholds()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build where conditions
  const conditions = []

  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  if (
    searchParams.lifecycleStatus &&
    LIFECYCLE_VALUES.includes(searchParams.lifecycleStatus as LifecycleStatus)
  ) {
    conditions.push(
      eq(applications.lifecycleStatus, searchParams.lifecycleStatus as LifecycleStatus)
    )
  }

  if (searchParams.aiEnabled === 'true') {
    conditions.push(eq(applications.isAiEnabled, true))
  }

  if (searchParams.search) {
    conditions.push(ilike(applications.name, `%${searchParams.search}%`))
  }

  if (searchParams.vendor) {
    conditions.push(ilike(applications.manufacturerVendor, `%${searchParams.vendor}%`))
  }

  // Apply staleness filter at DB level
  if (searchParams.staleness === 'critical') {
    const cutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)
    conditions.push(lt(applications.lastReviewedAt, cutoff))
  } else if (searchParams.staleness === 'warning') {
    const warnCutoff = new Date(Date.now() - thresholds.warning * 24 * 60 * 60 * 1000)
    conditions.push(lt(applications.lastReviewedAt, warnCutoff))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Count total for pagination
  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(applications)
    .where(whereClause)

  const total = Number(totalCount)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const rows = await db
    .select()
    .from(applications)
    .where(whereClause)
    .orderBy(asc(applications.lastReviewedAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  // Compute staleness
  const items = rows.map((app) => ({
    ...app,
    staleness: getStaleness(app.lastReviewedAt, thresholds),
    daysSinceReview: getDaysSinceReview(app.lastReviewedAt),
  }))

  // Build filter URL helper
  function filterUrl(overrides: SearchParams) {
    const merged = { ...searchParams, ...overrides }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return `/dashboard/applications${qs ? `?${qs}` : ''}`
  }

  const showingFrom = total === 0 ? 0 : offset + 1
  const showingTo = Math.min(offset + PAGE_SIZE, total)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        {canEdit && (
          <Link
            href="/dashboard/applications/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Application
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Search */}
        <div className="flex-1 min-w-40">
          <label htmlFor="search" className="block text-xs font-medium text-gray-600 mb-1">
            Search
          </label>
          <input
            id="search"
            name="search"
            type="text"
            defaultValue={searchParams.search ?? ''}
            placeholder="Application name..."
            className="block w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vendor search */}
        <div className="flex-1 min-w-40">
          <label htmlFor="vendor" className="block text-xs font-medium text-gray-600 mb-1">
            Vendor
          </label>
          <input
            id="vendor"
            name="vendor"
            type="text"
            defaultValue={searchParams.vendor ?? ''}
            placeholder="Vendor name..."
            className="block w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lifecycle status */}
        <div>
          <label htmlFor="lifecycleStatus" className="block text-xs font-medium text-gray-600 mb-1">
            Lifecycle Status
          </label>
          <select
            id="lifecycleStatus"
            name="lifecycleStatus"
            defaultValue={searchParams.lifecycleStatus ?? ''}
            className="block border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {LIFECYCLE_VALUES.map((s) => (
              <option key={s} value={s}>
                {LIFECYCLE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Staleness */}
        <div>
          <label htmlFor="staleness" className="block text-xs font-medium text-gray-600 mb-1">
            Staleness
          </label>
          <select
            id="staleness"
            name="staleness"
            defaultValue={searchParams.staleness ?? ''}
            className="block border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="warning">Warning ({thresholds.warning}+ days)</option>
            <option value="critical">Critical ({thresholds.critical}+ days)</option>
          </select>
        </div>

        {/* AI Enabled */}
        <div className="flex items-center gap-2 pb-1.5">
          <input
            id="aiEnabled"
            name="aiEnabled"
            type="checkbox"
            value="true"
            defaultChecked={searchParams.aiEnabled === 'true'}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="aiEnabled" className="text-sm text-gray-700">
            AI-Enabled only
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="px-4 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition-colors"
        >
          Filter
        </button>

        {/* Clear */}
        <Link
          href="/dashboard/applications"
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Clear
        </Link>
      </form>

      {/* Results */}
      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <p className="text-gray-500 text-sm">No applications found.</p>
          {canEdit && (
            <Link
              href="/dashboard/applications/new"
              className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Add the first application
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Lifecycle Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Last Reviewed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Staleness
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((app) => {
                const isRetired = app.lifecycleStatus === 'retired_from_inventory'
                return (
                  <tr
                    key={app.id}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      isRetired && 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/applications/${app.id}`}
                        className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {app.name}
                      </Link>
                      {isRetired && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                          Retired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {app.manufacturerVendor ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {LIFECYCLE_LABELS[app.lifecycleStatus]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {app.lastReviewedAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StalenessIndicator
                        level={app.staleness}
                        daysAgo={app.daysSinceReview}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer: count + pagination */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {showingFrom}–{showingTo} of {total} application{total !== 1 ? 's' : ''}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={filterUrl({ page: String(page - 1) })}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    &larr; Prev
                  </Link>
                ) : (
                  <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-md cursor-not-allowed">
                    &larr; Prev
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={filterUrl({ page: String(page + 1) })}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Next &rarr;
                  </Link>
                ) : (
                  <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-md cursor-not-allowed">
                    Next &rarr;
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
