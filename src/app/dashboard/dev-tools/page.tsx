import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth'
import DevToolsClient from './DevToolsClient'

export default async function DevToolsPage() {
  // Strict guard — dev mode only
  if (process.env.AUTH_BYPASS !== 'true') {
    redirect('/dashboard')
  }

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Testing Tools</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Dev mode only — load predefined data scenarios to test specific workflows.
        </p>
      </div>
      <DevToolsClient />
    </div>
  )
}
