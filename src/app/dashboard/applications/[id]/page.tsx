import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { eq, and, desc } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications, applicationAuditLog } from '@/lib/db/schema'
import type { LifecycleStatus } from '@/lib/db/schema'
import { getStaleness, getDaysSinceReview } from '@/lib/staleness'
import { getAgencyFilter, canEditApplication, canRetireApplication } from '@/lib/permissions'
import StalenessIndicator from '@/components/StalenessIndicator'
import RetireRevertButtons from './RetireRevertButtons'

const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  in_development: 'In Development',
  in_production: 'In Production',
  retirement_in_progress: 'Retirement in Progress',
  retired_from_inventory: 'Retired from Inventory',
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  retired: 'Retired',
  reverted: 'Reverted',
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function BooleanField({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${value ? 'bg-blue-500' : 'bg-gray-300'}`}
      />
      <span className={`text-sm ${value ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}: {value ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const agencyFilter = getAgencyFilter(session)
  const canEdit = canEditApplication(session)
  const canRetire = canRetireApplication(session)

  // Fetch application with agency scope enforcement
  const conditions = [eq(applications.id, params.id)]
  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  const [app] = await db
    .select()
    .from(applications)
    .where(and(...conditions))

  if (!app) notFound()

  const auditLog = await db
    .select()
    .from(applicationAuditLog)
    .where(eq(applicationAuditLog.applicationId, params.id))
    .orderBy(desc(applicationAuditLog.createdAt))

  const staleness = getStaleness(app.lastReviewedAt)
  const daysSinceReview = getDaysSinceReview(app.lastReviewedAt)
  const isRetired = app.lifecycleStatus === 'retired_from_inventory'
  const riskUnverified = app.riskFieldsLastVerifiedAt === null

  // Find previous lifecycle status for revert (from last retirement audit entry)
  let previousLifecycleStatus: LifecycleStatus = 'in_production'
  if (isRetired) {
    for (const entry of auditLog) {
      const changed = entry.changedFields as Record<string, { old: unknown; new: unknown }> | null
      if (
        (entry.action === 'retired' || entry.action === 'updated') &&
        changed?.lifecycleStatus?.old
      ) {
        const candidate = changed.lifecycleStatus.old as LifecycleStatus
        if (candidate !== 'retired_from_inventory') {
          previousLifecycleStatus = candidate
          break
        }
      }
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">
              {LIFECYCLE_LABELS[app.lifecycleStatus]}
            </span>
            <StalenessIndicator level={staleness} daysAgo={daysSinceReview} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Link
              href={`/dashboard/applications/${app.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
          )}
          {canRetire && (
            <RetireRevertButtons
              applicationId={app.id}
              isRetired={isRetired}
              previousLifecycleStatus={previousLifecycleStatus}
            />
          )}
        </div>
      </div>

      {/* Basic Info */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Basic Information
          </h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Name</dt>
            <dd className="text-sm font-medium text-gray-900">{app.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Lifecycle Status</dt>
            <dd className="text-sm text-gray-900">{LIFECYCLE_LABELS[app.lifecycleStatus]}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500 mb-0.5">Description</dt>
            <dd className="text-sm text-gray-900">{app.description ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Last Reviewed</dt>
            <dd className="text-sm text-gray-900">{formatDate(app.lastReviewedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Created</dt>
            <dd className="text-sm text-gray-900">{formatDate(app.createdAt)}</dd>
          </div>
        </dl>
      </section>

      {/* Technical Details */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Technical Details
          </h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Version</dt>
            <dd className="text-sm text-gray-900">{app.version ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Manufacturer / Vendor</dt>
            <dd className="text-sm text-gray-900">{app.manufacturerVendor ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Cloud Service Provider</dt>
            <dd className="text-sm text-gray-900">{app.cloudServiceProvider ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Technical Owner</dt>
            <dd className="text-sm text-gray-900">{app.technicalOwner ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Operating System</dt>
            <dd className="text-sm text-gray-900">
              {app.operatingSystem
                ? `${app.operatingSystem}${app.osVersion ? ` ${app.osVersion}` : ''}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Contract Number</dt>
            <dd className="text-sm text-gray-900">{app.contractNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">License Number</dt>
            <dd className="text-sm text-gray-900">{app.licenseNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">In Service Date</dt>
            <dd className="text-sm text-gray-900">{formatDate(app.inServiceDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Retirement Date</dt>
            <dd className="text-sm text-gray-900">{formatDate(app.retirementDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Updatable</dt>
            <dd className="text-sm text-gray-900">{app.isUpdatable ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </section>

      {/* Risk Flags */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Risk Flags
          </h2>
          {riskUnverified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Unverified
            </span>
          )}
        </div>
        <div className="px-5 py-4 space-y-2.5">
          {riskUnverified && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
              Risk flags have never been explicitly reviewed since this record was created.
              The values shown reflect what was entered at creation time.
            </p>
          )}
          <BooleanField value={app.isUnsupportedVersion} label="Unsupported Version" />
          <BooleanField value={app.isAgingTechnology} label="Aging Technology" />
          <BooleanField value={app.isAiEnabled} label="AI Enabled" />
          <BooleanField value={app.isGenerativeAi} label="Generative AI" />
          {app.riskFieldsLastVerifiedAt && (
            <p className="text-xs text-gray-400 pt-1">
              Last verified: {formatDateTime(app.riskFieldsLastVerifiedAt)}
            </p>
          )}
        </div>
      </section>

      {/* Audit History */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Audit History
          </h2>
        </div>
        {auditLog.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No audit entries found.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {auditLog.map((entry) => {
              const changedFields = entry.changedFields as Record<
                string,
                { old: unknown; new: unknown }
              > | null
              const fieldNames = changedFields ? Object.keys(changedFields) : []

              return (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">by {entry.userEmail}</span>
                    </div>
                    <time className="text-xs text-gray-400">
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  {fieldNames.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {fieldNames.map((field) => {
                        const change = changedFields![field]
                        return (
                          <li key={field} className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{field}</span>:{' '}
                            <span className="line-through text-red-500">
                              {String(change.old ?? '—')}
                            </span>{' '}
                            &rarr;{' '}
                            <span className="text-green-700">
                              {String(change.new ?? '—')}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
