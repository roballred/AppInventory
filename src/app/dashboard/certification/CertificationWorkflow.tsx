'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { Certification, Application } from '@/lib/db/schema'

interface CertificationWorkflowProps {
  certification: Certification | null
  year: number
  deadline: string // ISO date string
  totalApps: number
  criticalStaleApps: Application[]
  warningCount: number
  lifecycleCounts: Record<string, number>
  agencyName: string
}

const LIFECYCLE_LABELS: Record<string, string> = {
  in_development: 'In Development',
  in_production: 'In Production',
  retirement_in_progress: 'Retirement in Progress',
  retired_from_inventory: 'Retired from Inventory',
}

function formatDate(iso: string): string {
  // Append T12:00:00 to prevent UTC midnight from rolling back to the previous day in local time
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2',
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : isDone
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400',
              ].join(' ')}
            >
              {isDone ? '✓' : step}
            </div>
            {step < total && (
              <div
                className={[
                  'h-0.5 w-12',
                  isDone ? 'bg-green-600' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
      <div className="ml-3 text-sm text-gray-600">
        Step {current} of {total}
      </div>
    </div>
  )
}

export default function CertificationWorkflow({
  certification,
  year,
  deadline,
  totalApps,
  criticalStaleApps: initialCriticalStaleApps,
  warningCount,
  lifecycleCounts,
  agencyName,
}: CertificationWorkflowProps) {
  // Live critical stale apps — refreshed on demand to prevent stale-prop submission blocking
  const [criticalStaleApps, setCriticalStaleApps] = useState<Application[]>(initialCriticalStaleApps)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const refreshCriticalStale = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/certification/critical-stale')
      if (res.ok) {
        const data = await res.json()
        setCriticalStaleApps(data.criticalStaleApps ?? [])
        setRefreshedAt(new Date())
      }
    } catch {
      // silently fail — user can try again
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Determine initial step from certification status
  const getInitialStep = () => {
    if (!certification || certification.status === 'not_started') return 1
    if (
      certification.status === 'in_progress' ||
      certification.status === 'revision_requested'
    ) {
      return criticalStaleApps.length > 0 ? 2 : 1
    }
    return 1
  }

  const [step, setStep] = useState<number>(getInitialStep())
  const [attested, setAttested] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [currentCert, setCurrentCert] = useState<Certification | null>(certification)

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const totalSteps = criticalStaleApps.length > 0 ? 3 : 2

  // ── Submitted state ────────────────────────────────────────────────────────

  if (submitted || currentCert?.status === 'submitted') {
    return (
      <div className="max-w-2xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-xl font-bold text-amber-900 mb-2">
            Certification Submitted
          </h2>
          <p className="text-amber-800">
            Your {year} inventory certification has been submitted and is awaiting
            platform review.
          </p>
          {currentCert?.submittedAt && (
            <p className="text-sm text-amber-700 mt-2">
              Submitted on{' '}
              {new Date(currentCert.submittedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Approved state ─────────────────────────────────────────────────────────

  if (currentCert?.status === 'approved') {
    return (
      <div className="max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-green-900 mb-2">
            Certified for {year}
          </h2>
          <p className="text-green-800">
            Your agency inventory for {year} has been certified and approved.
          </p>
          {currentCert.approvedAt && (
            <p className="text-sm text-green-700 mt-2">
              Approved on{' '}
              {new Date(currentCert.approvedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Not started — Step 1 start button ─────────────────────────────────────

  if (!currentCert || currentCert.status === 'not_started') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {year} Annual Certification
          </h2>
          <p className="text-sm text-gray-600 mb-1">
            Deadline: <span className="font-medium">{formatDate(deadline)}</span>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            This is a guided 3-step process to review your inventory, resolve any stale
            records, and formally attest to its accuracy.
          </p>
          {startError && (
            <div className="bg-red-50 border border-red-200 rounded px-4 py-3 mb-4">
              <p className="text-sm text-red-700">{startError}</p>
            </div>
          )}
          <button
            onClick={async () => {
              setIsStarting(true)
              setStartError(null)
              try {
                const res = await fetch('/api/certification', { method: 'POST' })
                if (!res.ok) {
                  const data = await res.json()
                  setStartError(data.error ?? 'Failed to start certification.')
                  return
                }
                const cert = await res.json()
                setCurrentCert(cert)
                setStep(1)
              } catch {
                setStartError('Network error. Please try again.')
              } finally {
                setIsStarting(false)
              }
            }}
            disabled={isStarting}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStarting ? 'Starting...' : 'Start Certification'}
          </button>
        </div>
      </div>
    )
  }

  // ── Active workflow (in_progress or revision_requested) ───────────────────

  const staleCount = warningCount + criticalStaleApps.length

  return (
    <div className="max-w-2xl space-y-6">
      <StepIndicator current={step} total={totalSteps} />

      {/* Revision notes banner */}
      {currentCert.status === 'revision_requested' && currentCert.revisionNotes && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-yellow-900 mb-1">
            Revision Requested
          </p>
          <p className="text-sm text-yellow-800">{currentCert.revisionNotes}</p>
        </div>
      )}

      {/* ── Step 1 — Review Inventory Summary ─────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Step 1 — Review Inventory Summary
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Deadline: {formatDate(deadline)}
              </p>
            </div>
            <button
              onClick={refreshCriticalStale}
              disabled={isRefreshing}
              className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              title="Refresh stale record counts"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh status'}
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {refreshedAt && (
              <p className="text-xs text-gray-400">
                Status refreshed at {refreshedAt.toLocaleTimeString()}
              </p>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-xs text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{totalApps}</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-xs text-gray-500">Stale Records</p>
                <p
                  className={`text-2xl font-bold ${
                    staleCount > 0 ? 'text-yellow-700' : 'text-gray-900'
                  }`}
                >
                  {staleCount}
                </p>
              </div>
              <div
                className={`rounded-md p-3 ${
                  criticalStaleApps.length > 0 ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <p className="text-xs text-gray-500">Critical Stale</p>
                <p
                  className={`text-2xl font-bold ${
                    criticalStaleApps.length > 0 ? 'text-red-700' : 'text-gray-900'
                  }`}
                >
                  {criticalStaleApps.length}
                </p>
              </div>
            </div>

            {/* Lifecycle breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                By Lifecycle Status
              </p>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                {Object.entries(lifecycleCounts).map(([status, cnt]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      {LIFECYCLE_LABELS[status] ?? status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical stale warning */}
            {criticalStaleApps.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-sm font-semibold text-red-800">
                  {criticalStaleApps.length} critically stale record
                  {criticalStaleApps.length !== 1 ? 's' : ''} must be resolved before
                  submitting.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              {criticalStaleApps.length > 0 ? (
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  Resolve {criticalStaleApps.length} Stale Record
                  {criticalStaleApps.length !== 1 ? 's' : ''} (Step 2)
                </button>
              ) : (
                <button
                  onClick={() => setStep(totalSteps)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Continue to Attestation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 — Resolve Stale Records ────────────────────────────────── */}
      {step === 2 && criticalStaleApps.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Step 2 — Resolve Stale Records
            </h2>
            <button
              onClick={refreshCriticalStale}
              disabled={isRefreshing}
              className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh status'}
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {refreshedAt && (
              <p className="text-xs text-gray-400">
                Status refreshed at {refreshedAt.toLocaleTimeString()}
              </p>
            )}
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
              <p className="text-sm text-red-800">
                These {criticalStaleApps.length} record
                {criticalStaleApps.length !== 1 ? 's are' : ' is'} critically stale
                (180+ days). They must be updated before you can submit certification.
              </p>
            </div>

            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
              {criticalStaleApps.map((app) => {
                const days = Math.floor(
                  (Date.now() - new Date(app.lastReviewedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return (
                  <li key={app.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-red-600">{days} days since last review</p>
                    </div>
                    <Link
                      href={`/dashboard/applications/${app.id}/edit?returnTo=certification`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Update record
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="pt-1 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                &larr; Return to Step 1
              </button>
              {criticalStaleApps.length === 0 && (
                <button
                  onClick={() => setStep(totalSteps)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  All resolved — Continue to Attestation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3 / Last Step — Attest and Submit ────────────────────────── */}
      {step === totalSteps && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Step {totalSteps} — Attest and Submit
            </h2>
            <button
              onClick={refreshCriticalStale}
              disabled={isRefreshing}
              className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh status'}
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {refreshedAt && (
              <p className="text-xs text-gray-400">
                Status refreshed at {refreshedAt.toLocaleTimeString()}
              </p>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-md px-4 py-3">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{totalApps}</span> application
                {totalApps !== 1 ? 's' : ''} in inventory.{' '}
                <span className={staleCount > 0 ? 'text-yellow-700 font-semibold' : ''}>
                  {staleCount} stale record{staleCount !== 1 ? 's' : ''}.
                </span>
              </p>
            </div>

            {/* Critical stale blocker */}
            {criticalStaleApps.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-sm font-semibold text-red-800">
                  You have {criticalStaleApps.length} critically stale record
                  {criticalStaleApps.length !== 1 ? 's' : ''} that must be resolved
                  before submitting.
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                >
                  Resolve stale records
                </button>
              </div>
            )}

            {/* Attestation checkbox */}
            <div className="border border-gray-200 rounded-md p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={criticalStaleApps.length > 0}
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I certify that the application inventory submitted is accurate and
                  complete to the best of my knowledge as of {todayStr}. I understand
                  this certification is a formal attestation on behalf of {agencyName}.
                </span>
              </label>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                &larr; Back
              </button>
              <button
                onClick={async () => {
                  setIsSubmitting(true)
                  setSubmitError(null)
                  try {
                    // Refresh live count immediately before submitting (ISSUE-04 fix)
                    await refreshCriticalStale()
                    // The refreshCriticalStale call updates state — re-check will happen
                    // on next render. Submit proceeds; server will re-validate authoritatively.
                    const res = await fetch('/api/certification/submit', {
                      method: 'POST',
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      setSubmitError(data.error ?? 'Submission failed. Please try again.')
                      // If the server blocked it due to critical stale records, surface the fresh count
                      if (data.blockers) {
                        setCriticalStaleApps(data.blockers)
                      }
                      return
                    }
                    const cert = await res.json()
                    setCurrentCert(cert)
                    setSubmitted(true)
                  } catch {
                    setSubmitError('Network error. Please try again.')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={
                  !attested || criticalStaleApps.length > 0 || isSubmitting
                }
                className="inline-flex items-center px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Certification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
