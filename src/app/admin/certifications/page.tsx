import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { certifications, agencies } from '@/lib/db/schema'
import type { CertificationStatus } from '@/lib/db/schema'
import { getCurrentCertificationYear } from '@/lib/certification'

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_LABELS: Record<CertificationStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  revision_requested: 'Revision Requested',
}

const STATUS_BADGE_CLASSES: Record<CertificationStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  revision_requested: 'bg-yellow-100 text-yellow-800',
}

export default async function AdminCertificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    redirect('/dashboard')
  }

  const year = await getCurrentCertificationYear()

  // Fetch all agencies
  const allAgencies = await db.select().from(agencies)

  // Fetch all certifications for this year
  const certRows = await db
    .select()
    .from(certifications)
    .where(eq(certifications.year, year))

  // Build map: agencyId -> certification
  const certMap = new Map(certRows.map((c) => [c.agencyId, c]))

  // Build unified list
  const rows = allAgencies.map((agency) => ({
    agency,
    cert: certMap.get(agency.id) ?? null,
  }))

  // Summary counts
  const submitted = rows.filter((r) => r.cert?.status === 'submitted').length
  const approved = rows.filter((r) => r.cert?.status === 'approved').length
  const notStarted = rows.filter(
    (r) => !r.cert || r.cert.status === 'not_started'
  ).length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Certifications — {year}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Annual inventory certification status for all agencies.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">
            Submitted
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{submitted}</p>
          <p className="text-xs text-amber-600 mt-0.5">Awaiting review</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
            Approved
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">{approved}</p>
          <p className="text-xs text-green-600 mt-0.5">Certified</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
            Not Started
          </p>
          <p className="text-3xl font-bold text-gray-700 mt-1">{notStarted}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pending action</p>
        </div>
      </div>

      {/* Certifications table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Agency
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Submitted
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Records
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ agency, cert }) => {
              const status: CertificationStatus = cert?.status ?? 'not_started'
              return (
                <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{agency.name}</p>
                    <p className="text-xs text-gray-400">{agency.agencyNumber}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {cert?.submittedAt ? formatDate(cert.submittedAt) : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {cert?.recordCount != null ? cert.recordCount : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {cert && status === 'submitted' && (
                      <Link
                        href={`/admin/certifications/${cert.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Review &amp; Approve
                      </Link>
                    )}
                    {cert && (status === 'approved' || status === 'revision_requested') && (
                      <Link
                        href={`/admin/certifications/${cert.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
