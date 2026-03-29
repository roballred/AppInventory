import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth/auth'
import { computePortfolioIntelligence } from '@/lib/portfolio'
import type { AgencyHealthRow, VendorCount } from '@/lib/portfolio'
import type { CertificationStatus } from '@/lib/db/schema'

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number): number {
  if (total === 0) return 0
  return Math.round((n / total) * 100)
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-green-700'
  if (score >= 60) return 'text-yellow-700'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-700'
}

function healthBg(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-400'
  if (score >= 40) return 'bg-orange-400'
  return 'bg-red-500'
}

const CERT_LABELS: Record<CertificationStatus | 'no_record', string> = {
  no_record: 'Not Started',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved ✓',
  revision_requested: 'Revision Requested',
}

const CERT_BADGE: Record<CertificationStatus | 'no_record', string> = {
  no_record: 'bg-gray-100 text-gray-500',
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  revision_requested: 'bg-yellow-100 text-yellow-800',
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: 'red' | 'yellow' | 'blue' | 'green' | 'gray'
}) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  }
  const cls = colors[accent ?? 'gray']
  return (
    <div className={`rounded-lg border px-4 py-3 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Health bar ───────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full ${healthBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${healthColor(score)}`}>
        {score}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PortfolioPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'platform_admin') redirect('/dashboard')

  const data = await computePortfolioIntelligence()

  const totalActive = data.totalActiveApps
  const staleTotal = data.totalCritical + data.totalWarning

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cross-agency overview — {data.certYear} certification cycle
        </p>
      </div>

      {/* ── Executive summary ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Agencies" value={data.totalAgencies} accent="gray" />
        <StatCard
          label="Active Applications"
          value={data.totalActiveApps}
          sub={`${data.totalRetiredApps} retired`}
          accent="blue"
        />
        <StatCard
          label="Critically Stale"
          value={data.totalCritical}
          sub={`${pct(data.totalCritical, totalActive)}% of active`}
          accent={data.totalCritical > 0 ? 'red' : 'gray'}
        />
        <StatCard
          label="Warning Stale"
          value={data.totalWarning}
          sub={`${pct(data.totalWarning, totalActive)}% of active`}
          accent={data.totalWarning > 0 ? 'yellow' : 'gray'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="AI-Enabled" value={data.totalAiEnabled} sub={`${data.totalGenerativeAi} generative AI`} accent="blue" />
        <StatCard label="Aging Technology" value={data.totalAging} accent={data.totalAging > 0 ? 'yellow' : 'gray'} />
        <StatCard label="Unsupported Version" value={data.totalUnsupported} accent={data.totalUnsupported > 0 ? 'red' : 'gray'} />
        <StatCard
          label="Certifications Approved"
          value={data.certificationSummary.approved}
          sub={`of ${data.totalAgencies} agencies`}
          accent="green"
        />
      </div>

      {/* ── Two-column middle section ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Staleness distribution */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Staleness Distribution</h2>
          <div className="space-y-3">
            {[
              { label: 'Current', value: data.totalCurrent, color: 'bg-green-500' },
              { label: 'Warning (90–179 days)', value: data.totalWarning, color: 'bg-yellow-400' },
              { label: 'Critical (180+ days)', value: data.totalCritical, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{label}</span>
                  <span className="font-semibold">{value} ({pct(value, totalActive)}%)</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${color} transition-all`}
                    style={{ width: `${pct(value, totalActive)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">{totalActive} active applications</p>
        </div>

        {/* Certification status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {data.certYear} Certification Status
          </h2>
          <div className="space-y-2">
            {(
              [
                ['approved', 'Approved'],
                ['submitted', 'Submitted — Awaiting Review'],
                ['in_progress', 'In Progress'],
                ['revision_requested', 'Revision Requested'],
                ['not_started', 'Not Started'],
                ['no_record', 'No Record'],
              ] as Array<[CertificationStatus | 'no_record', string]>
            ).map(([status, label]) => {
              const n = data.certificationSummary[status]
              if (n === 0) return null
              return (
                <div key={status} className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CERT_BADGE[status]}`}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-blue-400"
                        style={{ width: `${pct(n, data.totalAgencies)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-6 text-right">{n}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link
              href="/admin/certifications"
              className="text-xs text-blue-600 hover:underline"
            >
              View certification details →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Top vendors ───────────────────────────────────────────────── */}
      {data.topVendors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Vendors by Application Count</h2>
          <div className="space-y-2">
            {data.topVendors.map(({ vendor, count: cnt }, i) => (
              <div key={vendor} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-400"
                      style={{ width: `${pct(cnt, data.topVendors[0].count)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 w-32 truncate">{vendor}</span>
                  <span className="text-xs font-semibold text-gray-900 w-8 text-right">{cnt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Agency health table ────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Agency Health</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sorted by health score (lowest first — most attention needed at top).
            Score is 0–100 based on staleness and certification status.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agency</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Apps</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="text-red-600">Critical</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="text-yellow-600">Warning</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">AI</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk Flags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Certification</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.agencyRows.map((row) => (
                <tr key={row.agency.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.agency.name}</p>
                    <p className="text-xs text-gray-400">{row.agency.agencyNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.activeApps}
                    {row.retiredApps > 0 && (
                      <span className="text-xs text-gray-400 ml-1">+{row.retiredApps}r</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.criticalCount > 0 ? (
                      <span className="font-semibold text-red-700">{row.criticalCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.warningCount > 0 ? (
                      <span className="font-semibold text-yellow-700">{row.warningCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.aiCount > 0 ? row.aiCount : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.agingCount + row.unsupportedCount > 0
                      ? row.agingCount + row.unsupportedCount
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        CERT_BADGE[row.certStatus ?? 'no_record']
                      }`}
                    >
                      {CERT_LABELS[row.certStatus ?? 'no_record']}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <HealthBar score={row.healthScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health score legend */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Health Score Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span><span className="font-semibold text-green-700">80–100</span> — Good standing</span>
          <span><span className="font-semibold text-yellow-700">60–79</span> — Needs attention</span>
          <span><span className="font-semibold text-orange-600">40–59</span> — At risk</span>
          <span><span className="font-semibold text-red-700">0–39</span> — Critical</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Score formula: 100 base − (20 × critical stale, max 60) − (5 × warning stale, max 20).
          Approved certification: +10. Not started: −10.
        </p>
      </div>
    </div>
  )
}
