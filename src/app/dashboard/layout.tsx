import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth/auth'
import SideNav from '@/components/nav/SideNav'
import SignOutButton from '@/components/SignOutButton'

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  agency_admin: 'Agency Admin',
  submitter: 'Submitter',
  viewer: 'Viewer',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const user = session.user as any
  const isDevMode = process.env.AUTH_BYPASS === 'true'
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <Link href="/dashboard" className="text-base font-semibold text-gray-900 hover:text-blue-700 transition-colors">
          State Application Inventory
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">{user.name ?? user.email}</p>
            <p className="text-gray-500">{roleLabel}</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <SideNav role={user.role} isDevMode={isDevMode} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
