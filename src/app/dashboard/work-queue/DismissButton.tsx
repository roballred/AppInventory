'use client'

import { useState } from 'react'
import type { QueueItemReason } from '@/lib/work-queue'

interface DismissButtonProps {
  applicationId: string
  reason: QueueItemReason
  onDismiss: () => void
}

export default function DismissButton({ applicationId, reason, onDismiss }: DismissButtonProps) {
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  async function handleDismiss() {
    setLoading(true)
    try {
      const response = await fetch('/api/work-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, reason }),
      })
      if (response.ok) {
        setDismissed(true)
        onDismiss()
      }
    } finally {
      setLoading(false)
    }
  }

  if (dismissed) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
        Dismissed
      </span>
    )
  }

  return (
    <button
      onClick={handleDismiss}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Dismissing…' : 'Dismiss'}
    </button>
  )
}
