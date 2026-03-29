'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { RiskItem } from '@/lib/risk-dashboard'

// ─── Lifecycle status labels ──────────────────────────────────────────────────

const LIFECYCLE_LABELS: Record<string, string> = {
  in_development: 'In Development',
  in_production: 'In Production',
  retirement_in_progress: 'Retirement in Progress',
  retired_from_inventory: 'Retired from Inventory',
}

const LIFECYCLE_BADGE_CLASSES: Record<string, string> = {
  in_development: 'bg-blue-50 text-blue-700 border border-blue-200',
  in_production: 'bg-green-50 text-green-700 border border-green-200',
  retirement_in_progress: 'bg-orange-50 text-orange-700 border border-orange-200',
  retired_from_inventory: 'bg-gray-100 text-gray-500 border border-gray-200',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyUser {
  id: string
  email: string
  name: string
}

interface RiskCategorySectionProps {
  title: string
  description: string
  items: RiskItem[]
  agencyUsers: AgencyUser[]
}

// ─── Inline assign form ───────────────────────────────────────────────────────

interface AssignFormProps {
  applicationId: string
  agencyUsers: AgencyUser[]
  onSuccess: (assignedToName: string, assignedToEmail: string) => void
  onCancel: () => void
}

function AssignForm({ applicationId, agencyUsers, onSuccess, onCancel }: AssignFormProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) {
      setError('Please select a user to assign this record to.')
      return
    }

    const selectedUser = agencyUsers.find((u) => u.id === selectedUserId)
    if (!selectedUser) {
      setError('Selected user not found.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/review-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          assignedToId: selectedUser.id,
          assignedToEmail: selectedUser.email,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? 'Failed to create assignment.')
        setIsSubmitting(false)
        return
      }

      onSuccess(selectedUser.name, selectedUser.email)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
      <div>
        <label htmlFor={`assign-user-${applicationId}`} className="block text-sm font-medium text-gray-700 mb-1">
          Assign to
        </label>
        <select
          id={`assign-user-${applicationId}`}
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="block w-full max-w-sm text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
        >
          <option value="">Select a team member…</option>
          {agencyUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`assign-notes-${applicationId}`} className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id={`assign-notes-${applicationId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add context for the reviewer…"
          className="block w-full max-w-sm text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Assigning…' : 'Assign'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RiskCategorySection({
  title,
  description,
  items,
  agencyUsers,
}: RiskCategorySectionProps) {
  // Track which applicationId currently has the assign form open
  const [openFormId, setOpenFormId] = useState<string | null>(null)

  // Track assignments that were just created (applicationId → assignee display string)
  const [newAssignments, setNewAssignments] = useState<Map<string, string>>(new Map())

  function handleAssignSuccess(applicationId: string, assignedToName: string, assignedToEmail: string) {
    setNewAssignments((prev) => {
      const next = new Map(prev)
      next.set(applicationId, `${assignedToName} (${assignedToEmail})`)
      return next
    })
    setOpenFormId(null)
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {items.length}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-gray-500">No {title.toLowerCase()} risks identified.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100" role="list">
          {items.map((item) => {
            const app = item.application
            const lifecycleLabel = LIFECYCLE_LABELS[app.lifecycleStatus] ?? app.lifecycleStatus
            const lifecycleBadgeClass =
              LIFECYCLE_BADGE_CLASSES[app.lifecycleStatus] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
            const lastReviewedDate = app.lastReviewedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
            const isFormOpen = openFormId === app.id
            const newAssignment = newAssignments.get(app.id)
            const existingAssignment = item.openAssignment

            // Determine which assignment to display
            const assignedTo = newAssignment
              ? newAssignment
              : existingAssignment
              ? existingAssignment.assignedToEmail
              : null

            return (
              <li key={`${item.category}-${app.id}`} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left: name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Application name link */}
                      <Link
                        href={`/dashboard/applications/${app.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                      >
                        {app.name}
                      </Link>

                      {/* Lifecycle status badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${lifecycleBadgeClass}`}>
                        {lifecycleLabel}
                      </span>

                      {/* Unverified badge — only for risk flag categories */}
                      {item.isUnverified && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Unverified
                        </span>
                      )}

                      {/* Assignment badge */}
                      {assignedTo && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          Assigned to {assignedTo}
                        </span>
                      )}
                    </div>

                    {/* Last reviewed date */}
                    <p className="text-xs text-gray-500">
                      Last reviewed: {lastReviewedDate}
                      {item.daysUntilCritical !== undefined && (
                        <span className="ml-2 text-yellow-700 font-medium">
                          ({item.daysUntilCritical} day{item.daysUntilCritical !== 1 ? 's' : ''} until critical)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Right: assign button */}
                  <div className="flex-shrink-0">
                    {!assignedTo && !isFormOpen && (
                      <button
                        type="button"
                        onClick={() => setOpenFormId(app.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Assign for Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline assign form — shown below the row */}
                {isFormOpen && !assignedTo && (
                  <AssignForm
                    applicationId={app.id}
                    agencyUsers={agencyUsers}
                    onSuccess={(name, email) => handleAssignSuccess(app.id, name, email)}
                    onCancel={() => setOpenFormId(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
