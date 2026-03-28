'use client'

import { useRouter } from 'next/navigation'
import ApplicationForm from '@/components/ApplicationForm'
import type { Application } from '@/lib/db/schema'

interface EditApplicationClientProps {
  application: Application
  agencyId: string
}

export default function EditApplicationClient({
  application,
  agencyId,
}: EditApplicationClientProps) {
  const router = useRouter()

  return (
    <ApplicationForm
      application={application}
      agencyId={agencyId}
      onSuccess={(id) => router.push(`/dashboard/applications/${id}`)}
    />
  )
}
