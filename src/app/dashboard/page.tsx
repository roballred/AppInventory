import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'
import SignOutButton from '@/components/SignOutButton'

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  agency_admin: 'Agency Admin',
  submitter: 'Submitter',
  viewer: 'Viewer',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user

  // Check database connectivity
  let dbStatus: 'connected' | 'error' = 'error'
  try {
    await pool.query('SELECT 1')
    dbStatus = 'connected'
  } catch {
    dbStatus = 'error'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">State Application Inventory</h1>
          <SignOutButton />
        </div>

        {/* Session info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Signed In As
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{user.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{user.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Role</p>
              <p className="font-medium">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <div>
              <p className="text-gray-500">Agency</p>
              <p className="font-medium">{user.agencyName ?? 'All agencies (platform admin)'}</p>
            </div>
          </div>
        </div>

        {/* System status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            System Status
          </h2>
          <div className="flex items-center gap-2 text-sm">
            {dbStatus === 'connected' ? (
              <>
                <span className="text-green-600">✓</span>
                <span className="text-green-700 font-medium">Database connected</span>
              </>
            ) : (
              <>
                <span className="text-red-600">✗</span>
                <span className="text-red-700 font-medium">Database connection failed</span>
                <span className="text-gray-500">— check DATABASE_URL in .env.local</span>
              </>
            )}
          </div>
        </div>

        {/* Build note */}
        <p className="text-xs text-gray-400 text-center">
          Hello world build — auth and database confirmed working.
          Capabilities will be added here as they are built.
        </p>

      </div>
    </main>
  )
}
