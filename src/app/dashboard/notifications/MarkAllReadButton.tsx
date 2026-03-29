'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkAllReadButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Marking…' : 'Mark all read'}
    </button>
  )
}
