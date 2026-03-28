import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import { getStalenessThresholds } from '@/lib/business-rules'
import { computeWorkQueue } from '@/lib/work-queue'
import WorkQueueList from './WorkQueueList'

export default async function WorkQueuePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  const role: string = user.role ?? ''

  // Only submitters and agency_admins have a work queue
  if (role !== 'submitter' && role !== 'agency_admin') {
    redirect('/dashboard')
  }

  const agencyId: string | null = user.agencyId ?? null
  if (!agencyId) redirect('/dashboard')

  const userId: string = user.email ?? user.id ?? 'unknown'
  const agencyName: string = user.agencyName ?? ''

  const thresholds = await getStalenessThresholds()
  const items = await computeWorkQueue(agencyId, userId, thresholds)

  const totalCount = items.length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Work Queue</h1>
        {agencyName && (
          <p className="text-sm text-gray-500 mt-0.5">{agencyName}</p>
        )}
        <p className="text-sm text-gray-600 mt-2">
          {totalCount > 0
            ? `${totalCount} record${totalCount !== 1 ? 's' : ''} need attention`
            : 'All up to date'}
        </p>
      </div>

      {/* Queue list (client component manages state) */}
      <WorkQueueList initialItems={items} />
    </div>
  )
}
