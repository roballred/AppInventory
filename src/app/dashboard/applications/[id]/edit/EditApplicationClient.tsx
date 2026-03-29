'use client'

import { useRouter } from 'next/navigation'
import ApplicationForm from '@/components/ApplicationForm'
import type { Application } from '@/lib/db/schema'

interface EditApplicationClientProps {
  application: Application
  agencyId: string
  returnTo?: string
}

export default function EditApplicationClient({
  application,
  agencyId,
  returnTo,
}: EditApplicationClientProps) {
  const router = useRouter()

  function handleSuccess(id: string) {
    if (returnTo === 'work-queue') {
      router.push('/dashboard/work-queue')
    } else if (returnTo === 'certification') {
      router.push('/dashboard/certification')
    } else {
      router.push(`/dashboard/applications/${id}`)
    }
  }

  return (
    <ApplicationForm
      application={application}
      agencyId={agencyId}
      onSuccess={handleSuccess}
    />
  )
}
