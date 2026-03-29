import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { certifications, agencies } from '@/lib/db/schema'
import type { CertificationStatus } from '@/lib/db/schema'
import CertificationApprovalActions from './CertificationApprovalActions'

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const STATUS_LABELS: Record<CertificationStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted — Awaiting Review',
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

export default async function AdminCertificationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'platform_admin') {
    redirect('/dashboard')
  }

  const [cert] = await db
    .select()
    .from(certifications)
    .where(eq(certifications.id, params.id))

  if (!cert) notFound()

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, cert.agencyId))

  const agencyName = agency?.name ?? 'Unknown Agency'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin/certifications"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to Certifications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {agencyName} — {cert.year} Certification
          </h1>
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                STATUS_BADGE_CLASSES[cert.status]
              }`}
            >
              {STATUS_LABELS[cert.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Submission details */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Submission Details
          </h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Agency</dt>
            <dd className="text-sm font-medium text-gray-900">{agencyName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Certification Year</dt>
            <dd className="text-sm text-gray-900">{cert.year}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Submitted</dt>
            <dd className="text-sm text-gray-900">{formatDateTime(cert.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Submitted By</dt>
            <dd className="text-sm text-gray-900">{cert.submittedByEmail ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Record Count at Submission</dt>
            <dd className="text-sm text-gray-900">
              {cert.recordCount != null ? cert.recordCount : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">
              Critical Stale Count at Submission
            </dt>
            <dd className="text-sm text-gray-900">
              {cert.criticalStaleCount != null ? cert.criticalStaleCount : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Approval details (if approved) */}
      {cert.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg">
          <div className="px-5 py-4 border-b border-green-100">
            <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
              Approval Record
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
            <div>
              <dt className="text-xs text-green-700 mb-0.5">Approved On</dt>
              <dd className="text-sm font-medium text-green-900">
                {formatDateTime(cert.approvedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-green-700 mb-0.5">Approved By</dt>
              <dd className="text-sm text-green-900">{cert.approvedByEmail ?? '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Revision notes (if revision requested) */}
      {cert.status === 'revision_requested' && cert.revisionNotes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4">
          <p className="text-sm font-semibold text-yellow-900 mb-1">
            Revision Notes
          </p>
          <p className="text-sm text-yellow-800">{cert.revisionNotes}</p>
          <p className="text-xs text-yellow-600 mt-2">
            Requested on {formatDate(cert.revisionRequestedAt)}
          </p>
        </div>
      )}

      {/* Approval actions */}
      {cert.status === 'submitted' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Actions
            </h2>
          </div>
          <div className="px-5 py-4">
            <CertificationApprovalActions
              certificationId={cert.id}
              currentStatus={cert.status}
            />
          </div>
        </div>
      )}
    </div>
  )
}
