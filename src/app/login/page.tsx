import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import DevLoginForm from './DevLoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  const isDevBypass = process.env.AUTH_BYPASS === 'true'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Sign In</h1>
        <p className="text-gray-500 text-sm mb-6">State Application Inventory</p>

        {isDevBypass ? (
          <DevLoginForm />
        ) : (
          // Production: redirect to state identity provider via NextAuth
          // The identity provider is configured in src/lib/auth/auth.ts
          <p className="text-gray-600 text-sm">
            Redirecting to your state identity provider…
          </p>
        )}
      </div>
    </main>
  )
}
