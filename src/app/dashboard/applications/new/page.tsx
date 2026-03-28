'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ApplicationForm from '@/components/ApplicationForm'

export default function NewApplicationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    router.replace('/login')
    return null
  }

  const user = session.user as any

  // Viewer cannot add applications
  if (user.role === 'viewer') {
    router.replace('/dashboard/applications')
    return null
  }

  const agencyId = user.agencyId as string

  if (!agencyId) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-red-600">
          Platform admins must use the API to add applications (agency ID required).
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Application</h1>
        <p className="text-sm text-gray-500 mt-0.5">Add a new application to your inventory.</p>
      </div>
      <ApplicationForm
        agencyId={agencyId}
        onSuccess={(id) => router.push(`/dashboard/applications/${id}`)}
      />
    </div>
  )
}
