import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import { computeDataQuality } from '@/lib/data-quality'
import type { AgencyQualityRow, FieldCoverage } from '@/lib/data-quality'
import type { Application, Agency } from '@/lib/db/schema'

// ── Helpers ──────────────────────────────────────────────────────────────────

function completenessColor(score: number): string {
  if (score >= 85) return 'text-green-700'
  if (score >= 65) return 'text-yellow-700'
  if (score >= 45) return 'text-orange-600'
  return 'text-red-700'
}

function completenessBg(score: number): string {
  if (score >= 85) return 'bg-green-500'
  if (score >= 65) return 'bg-yellow-400'
  if (score >= 45) return 'bg-orange-400'
  return 'bg-red-500'
}

function coverageBg(pct: number): string {
  if (pct >= 80) return 'bg-green-400'
  if (pct >= 60) return 'bg-yellow-400'
  return 'bg-red-400'
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: number | string; sub?: string; accent?: 'red' | 'yellow' | 'blue' | 'green' | 'gray'
}) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[accent ?? 'gray']}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function ScoreBar({ score, colorFn }: { score: number; colorFn: (n: number) => string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${colorFn(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${completenessColor(score)}`}>
        {score}%
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DataQualityPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'platform_admin') redirect('/dashboard')

  const data = await computeDataQuality()
  const gapPct = data.totalActiveApps === 0
    ? 0
    : Math.round((data.totalAppsWithGaps / data.totalActiveApps) * 100)

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Quality Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Completeness and risk-verification coverage across all agencies.
        </p>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active Applications" value={data.totalActiveApps} accent="gray" />
        <StatCard
          label="Overall Completeness"
          value={`${data.overallCompleteness}%`}
          sub="optional fields filled"
          accent={data.overallCompleteness >= 80 ? 'green' : data.overallCompleteness >= 60 ? 'yellow' : 'red'}
        />
        <StatCard
          label="Records with Gaps"
          value={data.totalAppsWithGaps}
          sub={`${gapPct}% of active apps`}
          accent={data.totalAppsWithGaps > 0 ? 'yellow' : 'green'}
        />
        <StatCard
          label="Unverified Risk Flags"
          value={data.totalUnverifiedRisk}
          sub="AI/aging/unsupported, never verified"
          accent={data.totalUnverifiedRisk > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Field coverage ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Field Coverage — Least Filled First</h2>
        <p className="text-xs text-gray-500 mb-4">
          Optional fields tracked for data quality. Sorted by lowest coverage across all active apps.
        </p>
        <div className="space-y-3">
          {data.fieldCoverage.map(({ field, filled, missing, coveragePct }) => (
            <div key={field.key as string}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{field.description}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${completenessColor(coveragePct)}`}>
                    {coveragePct}%
                  </span>
                  <span className="text-xs text-gray-400 ml-1.5">
                    {filled} filled / {missing} missing
                  </span>
                </div>
              </div>
              <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${coverageBg(coveragePct)} transition-all`}
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Agency completeness table ────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Agency Completeness</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sorted by lowest completeness. Tracks {data.fieldCoverage.length} optional fields per active application.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agency</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Apps</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Records with Gaps</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="text-red-600">Unverified Risk</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Completeness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.agencyRows.map((row) => (
                <tr key={row.agency.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.agency.name}</p>
                    <p className="text-xs text-gray-400">{row.agency.agencyNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.activeApps}</td>
                  <td className="px-4 py-3 text-right">
                    {row.appsWithGaps > 0 ? (
                      <span className="font-semibold text-yellow-700">{row.appsWithGaps}</span>
                    ) : (
                      <span className="text-green-600 font-medium">✓ 0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.unverifiedRiskCount > 0 ? (
                      <span className="font-semibold text-red-700">{row.unverifiedRiskCount}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 w-48">
                    <ScoreBar score={row.completenessScore} colorFn={completenessBg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Unverified risk flags ────────────────────────────────────────── */}
      {data.unverifiedRiskApps.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-red-50">
            <h2 className="text-sm font-semibold text-red-900">
              Unverified Risk Flags ({data.unverifiedRiskApps.length})
            </h2>
            <p className="text-xs text-red-700 mt-0.5">
              These applications have AI, aging, or unsupported-version flags set but have never had those flags
              explicitly reviewed (riskFieldsLastVerifiedAt is null). Agency admins should verify or correct them.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.unverifiedRiskApps.map(({ app, agency }) => {
              const flags: string[] = []
              if (app.isAiEnabled) flags.push('AI-enabled')
              if (app.isGenerativeAi) flags.push('Generative AI')
              if (app.isAgingTechnology) flags.push('Aging technology')
              if (app.isUnsupportedVersion) flags.push('Unsupported version')
              return (
                <li key={app.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{app.name}</p>
                    <p className="text-xs text-gray-500">{agency.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {flags.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── All-clear ──────────────────────────────────────────────────── */}
      {data.unverifiedRiskApps.length === 0 && data.totalAppsWithGaps === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-base font-semibold text-green-800">Portfolio data quality is excellent</p>
          <p className="text-sm text-green-700 mt-1">
            All active applications have complete optional fields and verified risk flags.
          </p>
        </div>
      )}

      {/* Score legend */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completeness Score Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span><span className="font-semibold text-green-700">85–100%</span> — Excellent</span>
          <span><span className="font-semibold text-yellow-700">65–84%</span> — Acceptable</span>
          <span><span className="font-semibold text-orange-600">45–64%</span> — Needs improvement</span>
          <span><span className="font-semibold text-red-700">0–44%</span> — Poor</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Tracked fields: {data.fieldCoverage.map((f) => f.field.label).join(', ')}.
          Required fields (name, version, vendor, technical owner, in-service date) are excluded — they are enforced at record creation.
        </p>
      </div>
    </div>
  )
}
