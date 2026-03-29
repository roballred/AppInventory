'use client'

import { useState } from 'react'
import Link from 'next/link'
import DismissButton from './DismissButton'
import type { WorkQueueItem, QueueItemReason } from '@/lib/work-queue'

interface WorkQueueListProps {
  initialItems: WorkQueueItem[]
}

// ─── Tier metadata ────────────────────────────────────────────────────────────

interface TierMeta {
  label: string
  icon: string
  badgeClass: string
}

const TIER_META: Record<QueueItemReason, TierMeta> = {
  assigned: {
    label: 'Assigned for Review',
    icon: '📌',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
  },
  critical: {
    label: 'Critical — must resolve before certification',
    icon: '🔴',
    badgeClass: 'bg-red-100 text-red-800 border border-red-200',
  },
  warning: {
    label: 'Warning — review soon',
    icon: '🟡',
    badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  missing_fields: {
    label: 'Missing required fields',
    icon: '📋',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  unverified_risk: {
    label: 'Risk flags need review',
    icon: '🔍',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
  },
}

const EFFORT_BADGE: Record<string, string> = {
  quick: 'bg-green-100 text-green-800 border border-green-200',
  research: 'bg-amber-100 text-amber-800 border border-amber-200',
}

const REASON_ORDER: QueueItemReason[] = ['assigned', 'critical', 'warning', 'missing_fields', 'unverified_risk']

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkQueueList({ initialItems }: WorkQueueListProps) {
  const [items, setItems] = useState<WorkQueueItem[]>(initialItems)

  function handleDismiss(applicationId: string) {
    setItems((prev) => prev.filter((item) => item.application.id !== applicationId))
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="w-full bg-green-50 border border-green-200 rounded-lg px-6 py-10 text-center">
        <p className="text-2xl font-semibold text-green-800 mb-2">All up to date</p>
        <p className="text-sm text-green-700 mb-4">No records need attention right now.</p>
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors"
        >
          View all applications
        </Link>
      </div>
    )
  }

  // Group items by reason tier
  const grouped = new Map<QueueItemReason, WorkQueueItem[]>()
  for (const item of items) {
    const group = grouped.get(item.reason) ?? []
    group.push(item)
    grouped.set(item.reason, group)
  }

  return (
    <div className="space-y-8">
      {REASON_ORDER.filter((reason) => grouped.has(reason)).map((reason) => {
        const tierItems = grouped.get(reason)!
        const meta = TIER_META[reason]

        return (
          <section key={reason} aria-labelledby={`tier-heading-${reason}`}>
            <h2
              id={`tier-heading-${reason}`}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
            >
              <span aria-hidden="true">{meta.icon}</span>
              {meta.label}
            </h2>

            <ul className="space-y-3" role="list">
              {tierItems.map((item) => (
                <li
                  key={item.application.id}
                  className="bg-white border border-gray-200 rounded-lg px-5 py-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    {/* Left: name + reason + badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link
                          href={`/dashboard/applications/${item.application.id}`}
                          className="text-base font-bold text-gray-900 hover:text-blue-700 hover:underline"
                        >
                          {item.application.name}
                        </Link>
                        {/* Priority tier badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${meta.badgeClass}`}>
                          {reason === 'assigned' && 'Assigned'}
                          {reason === 'critical' && 'Critical'}
                          {reason === 'warning' && 'Warning'}
                          {reason === 'missing_fields' && 'Missing fields'}
                          {reason === 'unverified_risk' && 'Unverified risk'}
                        </span>
                        {/* Effort badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${EFFORT_BADGE[item.effortLevel]}`}>
                          {item.effortLabel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.reasonLabel}</p>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/dashboard/applications/${item.application.id}/edit?returnTo=work-queue`}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Update
                      </Link>
                      <DismissButton
                        applicationId={item.application.id}
                        reason={item.reason}
                        onDismiss={() => handleDismiss(item.application.id)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
