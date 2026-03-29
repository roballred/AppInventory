'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const DEV_ACCOUNTS = [
  { email: 'platform-admin@dev.local', label: 'Derek — Platform Admin' },
  { email: 'agency-admin@dev.local',   label: 'Maria — Agency Admin' },
  { email: 'submitter@dev.local',      label: 'Jordan — Submitter' },
  { email: 'viewer@dev.local',         label: 'Viewer — Viewer' },
]

interface DevUserSwitcherProps {
  currentEmail: string
}

export default function DevUserSwitcher({ currentEmail }: DevUserSwitcherProps) {
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  async function handleSwitch(email: string) {
    if (email === currentEmail || isSwitching) return
    setIsSwitching(true)
    try {
      await signIn('credentials', { email, redirect: false })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Dev
      </span>
      <select
        value={currentEmail}
        onChange={(e) => handleSwitch(e.target.value)}
        disabled={isSwitching}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 cursor-pointer"
      >
        {DEV_ACCOUNTS.map((a) => (
          <option key={a.email} value={a.email}>
            {a.label}
          </option>
        ))}
      </select>
      {isSwitching && (
        <span className="text-xs text-amber-600">Switching…</span>
      )}
    </div>
  )
}
