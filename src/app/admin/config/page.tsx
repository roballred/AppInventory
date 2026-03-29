import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { businessRules } from '@/lib/db/schema'
import ConfigClient from './ConfigClient'

export default async function AdminConfigPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  if (user.role !== 'platform_admin') redirect('/dashboard')

  const rules = await db.select().from(businessRules)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage staleness thresholds and certification settings. Changes take effect immediately for all agencies.
        </p>
      </div>
      <ConfigClient initialRules={rules} />
    </div>
  )
}
