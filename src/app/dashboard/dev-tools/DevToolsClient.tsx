'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ScenarioMeta = {
  key: string
  label: string
  description: string
  appCount: number
  hasCertification: boolean
  certificationStatus: string | null
}

const SCENARIO_ICONS: Record<string, string> = {
  clean: '✅',
  default: '🔀',
  certification_ready: '📋',
  certification_blocked: '🔴',
  ready_to_submit: '📤',
  certified: '🏅',
}

const CERT_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  revision_requested: 'Revision Requested',
}

// Static scenario metadata — mirrors the server definition so we don't need a fetch on load
const SCENARIOS: ScenarioMeta[] = [
  {
    key: 'clean',
    label: 'Clean Slate',
    description: 'All records recently reviewed. Zero stale. Certification not started.',
    appCount: 5,
    hasCertification: false,
    certificationStatus: null,
  },
  {
    key: 'default',
    label: 'Default Mix',
    description: 'Standard seed: one current, one warning, one critical, one in retirement, one AI with unverified risk.',
    appCount: 5,
    hasCertification: false,
    certificationStatus: null,
  },
  {
    key: 'certification_ready',
    label: 'Certification Ready',
    description: 'Warning stale records only — no critical blockers. Certification not started.',
    appCount: 5,
    hasCertification: false,
    certificationStatus: null,
  },
  {
    key: 'certification_blocked',
    label: 'Certification Blocked',
    description: '3 critically stale records (180+ days) blocking submission. Cert in progress.',
    appCount: 5,
    hasCertification: true,
    certificationStatus: 'in_progress',
  },
  {
    key: 'ready_to_submit',
    label: 'Ready to Submit',
    description: 'Zero critical stale. Cert in progress — go to Certification to attest and submit.',
    appCount: 5,
    hasCertification: true,
    certificationStatus: 'in_progress',
  },
  {
    key: 'certified',
    label: 'Certified (Approved)',
    description: 'Certification submitted and approved for the current year. All records current.',
    appCount: 5,
    hasCertification: true,
    certificationStatus: 'approved',
  },
]

export default function DevToolsClient() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadScenario(key: string) {
    setLoading(key)
    setError(null)
    try {
      const res = await fetch('/api/dev/load-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: key }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to load scenario.')
        return
      }

      setLastLoaded(key)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error — could not load scenario.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {lastLoaded && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-700">
            Loaded: <span className="font-semibold">{SCENARIOS.find(s => s.key === lastLoaded)?.label}</span>
            {' '} — redirecting to dashboard…
          </p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">⚠️ Destructive:</span> Loading a scenario replaces all Dev Test Agency application data and certifications. Other Agency data is unaffected.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SCENARIOS.map((scenario) => {
          const isLoading = loading === scenario.key
          const icon = SCENARIO_ICONS[scenario.key] ?? '📋'

          return (
            <div
              key={scenario.key}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{scenario.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded">
                  {scenario.appCount} apps
                </span>
                {scenario.hasCertification && scenario.certificationStatus ? (
                  <span className={[
                    'px-2 py-0.5 rounded',
                    scenario.certificationStatus === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : scenario.certificationStatus === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  ].join(' ')}>
                    Cert: {CERT_STATUS_LABELS[scenario.certificationStatus] ?? scenario.certificationStatus}
                  </span>
                ) : (
                  <span className="bg-gray-100 px-2 py-0.5 rounded">No cert</span>
                )}
              </div>

              <button
                onClick={() => loadScenario(scenario.key)}
                disabled={loading !== null}
                className="w-full inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  'Load this scenario'
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Persona Quick Reference</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
          <div><span className="font-medium text-gray-900">Jordan</span> — Submitter, Dev Test Agency</div>
          <div><span className="font-medium text-gray-900">Maria</span> — Agency Admin, Dev Test Agency</div>
          <div><span className="font-medium text-gray-900">Derek</span> — Platform Admin, all agencies</div>
          <div><span className="font-medium text-gray-900">Viewer</span> — Read-only, Dev Test Agency</div>
        </div>
      </div>

      {/* Notifications section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Notification Engine</h3>
        <p className="text-xs text-gray-500 mb-3">
          Trigger notification generation for all agencies. Staleness and deadline notifications are created based on current data. Duplicate notifications for today are skipped.
        </p>
        <GenerateNotificationsButton />
      </div>
    </div>
  )
}

function GenerateNotificationsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/notifications/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setResult(data.error ?? 'Generation failed.')
        return
      }
      const total = (data.results ?? []).reduce(
        (s: number, r: any) => s + r.staleness.warning + r.staleness.critical + (r.certDeadline ? 1 : 0),
        0
      )
      setStatus('done')
      setResult(`Generated ${total} new notification(s) across ${data.results?.length ?? 0} agenc${data.results?.length === 1 ? 'y' : 'ies'}.`)
    } catch {
      setStatus('error')
      setResult('Network error.')
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={generate}
        disabled={status === 'loading'}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? 'Generating…' : '🔔 Generate Notifications Now'}
      </button>
      {result && (
        <p className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {result}
        </p>
      )}
    </div>
  )
}
