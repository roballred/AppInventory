'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const DEV_ACCOUNTS = [
  { email: 'platform-admin@dev.local', label: 'Platform Admin — cross-agency access' },
  { email: 'agency-admin@dev.local', label: 'Agency Admin — Dev Test Agency' },
  { email: 'submitter@dev.local', label: 'Submitter — Dev Test Agency' },
  { email: 'viewer@dev.local', label: 'Viewer — Dev Test Agency' },
]

export default function DevLoginForm() {
  const router = useRouter()
  const [selected, setSelected] = useState(DEV_ACCOUNTS[0].email)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email: selected,
      redirect: false,
    })

    if (result?.error) {
      setError('Sign in failed. Check the server logs.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded p-3">
        <p className="text-amber-800 text-sm font-semibold">Dev mode — auth bypass enabled</p>
        <p className="text-amber-700 text-xs mt-1">
          Select any test account. This mode is never available in production.
        </p>
      </div>

      <div>
        <label
          htmlFor="dev-account"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Test Account
        </label>
        <select
          id="dev-account"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DEV_ACCOUNTS.map((a) => (
            <option key={a.email} value={a.email}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-700 text-white py-2 rounded font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
