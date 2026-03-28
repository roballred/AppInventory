import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getAgencyFilter, canEditApplication } from '@/lib/permissions'
import EditApplicationClient from './EditApplicationClient'

export default async function EditApplicationPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Viewers cannot edit — redirect to detail
  if (!canEditApplication(session)) {
    redirect(`/dashboard/applications/${params.id}`)
  }

  const agencyFilter = getAgencyFilter(session)

  const conditions = [eq(applications.id, params.id)]
  if (agencyFilter) {
    conditions.push(eq(applications.agencyId, agencyFilter))
  }

  const [app] = await db
    .select()
    .from(applications)
    .where(and(...conditions))

  if (!app) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Application</h1>
        <p className="text-sm text-gray-500 mt-0.5">{app.name}</p>
      </div>
      <EditApplicationClient application={app} agencyId={app.agencyId} />
    </div>
  )
}
