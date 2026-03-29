import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import { canEditApplication } from '@/lib/permissions'
import NewApplicationClient from './NewApplicationClient'

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Viewers cannot add applications
  if (!canEditApplication(session)) {
    redirect('/dashboard/applications')
  }

  const user = session.user as any
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
      <NewApplicationClient agencyId={agencyId} />
    </div>
  )
}
