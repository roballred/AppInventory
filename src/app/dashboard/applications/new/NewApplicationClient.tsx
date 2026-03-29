'use client'

import { useRouter } from 'next/navigation'
import ApplicationForm from '@/components/ApplicationForm'

interface NewApplicationClientProps {
  agencyId: string
}

export default function NewApplicationClient({ agencyId }: NewApplicationClientProps) {
  const router = useRouter()

  return (
    <ApplicationForm
      agencyId={agencyId}
      onSuccess={(id) => router.push(`/dashboard/applications/${id}`)}
    />
  )
}
