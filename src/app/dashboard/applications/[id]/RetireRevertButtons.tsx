'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LifecycleStatus } from '@/lib/db/schema'

interface RetireRevertButtonsProps {
  applicationId: string
  isRetired: boolean
  previousLifecycleStatus: LifecycleStatus
}

export default function RetireRevertButtons({
  applicationId,
  isRetired,
  previousLifecycleStatus,
}: RetireRevertButtonsProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<'retire' | 'revert' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function executeAction(action: 'retire' | 'revert') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          previousLifecycleStatus: action === 'revert' ? previousLifecycleStatus : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Request failed')
      }
      setConfirming(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (confirming === 'retire') {
    return (
      <div className="flex items-center gap-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-sm text-gray-600">Retire this application?</p>
        <button
          onClick={() => executeAction('retire')}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Retiring...' : 'Confirm Retire'}
        </button>
        <button
          onClick={() => setConfirming(null)}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (confirming === 'revert') {
    return (
      <div className="flex items-center gap-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-sm text-gray-600">
          Revert to &ldquo;{previousLifecycleStatus.replace(/_/g, ' ')}&rdquo;?
        </p>
        <button
          onClick={() => executeAction('revert')}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Reverting...' : 'Confirm Revert'}
        </button>
        <button
          onClick={() => setConfirming(null)}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isRetired ? (
        <button
          onClick={() => setConfirming('revert')}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
        >
          Revert
        </button>
      ) : (
        <button
          onClick={() => setConfirming('retire')}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
        >
          Retire
        </button>
      )}
    </>
  )
}
