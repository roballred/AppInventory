import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  const isDevBypass = process.env.AUTH_BYPASS === 'true'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-sm border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          State Application Inventory
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Manage your agency&apos;s application inventory and complete annual certification.
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-700 text-white px-8 py-3 rounded font-semibold hover:bg-blue-800 transition-colors"
        >
          Sign In
        </Link>
        {isDevBypass && (
          <p className="mt-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ Auth bypass is enabled — development mode only
          </p>
        )}
      </div>
    </main>
  )
}
