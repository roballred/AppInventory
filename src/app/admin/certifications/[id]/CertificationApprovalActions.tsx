'use client'

import { useState } from 'react'
import type { CertificationStatus } from '@/lib/db/schema'

interface CertificationApprovalActionsProps {
  certificationId: string
  currentStatus: CertificationStatus
}

export default function CertificationApprovalActions({
  certificationId,
  currentStatus,
}: CertificationApprovalActionsProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRequestingRevision, setIsRequestingRevision] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [updatedStatus, setUpdatedStatus] = useState<CertificationStatus | null>(null)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)

  if (updatedStatus === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4">
        <p className="text-sm font-semibold text-green-800">Certification Approved</p>
        {approvedAt && (
          <p className="text-sm text-green-700 mt-1">
            Approved on{' '}
            {new Date(approvedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    )
  }

  if (updatedStatus === 'revision_requested') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4">
        <p className="text-sm font-semibold text-yellow-800">Revision Requested</p>
        <p className="text-sm text-yellow-700 mt-1">
          The agency has been asked to revise and resubmit.
        </p>
      </div>
    )
  }

  // Already approved or revision_requested — read-only display handled by parent
  if (currentStatus === 'approved' || currentStatus === 'revision_requested') {
    return null
  }

  const handleApprove = async () => {
    setIsApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/certification/${certificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Approval failed. Please try again.')
        return
      }
      const cert = await res.json()
      setUpdatedStatus('approved')
      setApprovedAt(cert.approvedAt)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      setError('Please provide revision notes before submitting.')
      return
    }
    setIsRequestingRevision(true)
    setError(null)
    try {
      const res = await fetch(`/api/certification/${certificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_revision', notes: revisionNotes.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Request failed. Please try again.')
        return
      }
      setUpdatedStatus('revision_requested')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsRequestingRevision(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRequestingRevision}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isApproving ? 'Approving...' : 'Approve Certification'}
        </button>

        {!showRevisionForm && (
          <button
            onClick={() => setShowRevisionForm(true)}
            disabled={isApproving || isRequestingRevision}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Request Revision
          </button>
        )}
      </div>

      {showRevisionForm && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-yellow-900">Request Revision</p>
          <p className="text-xs text-yellow-700">
            Explain what the agency needs to correct before resubmitting.
          </p>
          <textarea
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Describe what needs to be revised..."
            rows={4}
            className="w-full text-sm border border-yellow-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRequestRevision}
              disabled={isRequestingRevision || !revisionNotes.trim()}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRequestingRevision ? 'Sending...' : 'Send Revision Request'}
            </button>
            <button
              onClick={() => {
                setShowRevisionForm(false)
                setRevisionNotes('')
                setError(null)
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
