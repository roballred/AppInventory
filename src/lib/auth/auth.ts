import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import { DEV_USERS } from './dev-users'

const isDevBypass =
  process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'

if (isDevBypass) {
  console.warn(
    '⚠️  AUTH_BYPASS is enabled. All dev accounts are accessible without a real identity provider. Never enable this in production.'
  )
}

export const authOptions: NextAuthOptions = {
  providers: isDevBypass
    ? [
        // Dev-only: bypass real identity provider, select any test account by email
        CredentialsProvider({
          name: 'Dev Login',
          credentials: {
            email: {
              label: 'Test Account',
              type: 'select',
            },
          },
          async authorize(credentials) {
            const user = DEV_USERS.find((u) => u.email === credentials?.email)
            if (!user) return null
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              agencyId: user.agencyId,
              agencyName: user.agencyName,
            }
          },
        }),
      ]
    : [
        // Production: real identity provider (Entra ID default — swap for your provider)
        AzureADProvider({
          clientId: process.env.IDENTITY_PROVIDER_CLIENT_ID!,
          clientSecret: process.env.IDENTITY_PROVIDER_CLIENT_SECRET!,
          tenantId: process.env.IDENTITY_PROVIDER_TENANT_ID,
          issuer: process.env.IDENTITY_PROVIDER_ISSUER_URL,
        }),
      ],

  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, attach role and agency to the JWT
      if (user) {
        token.role = (user as any).role
        token.agencyId = (user as any).agencyId
        token.agencyName = (user as any).agencyName
      }
      return token
    },
    async session({ session, token }) {
      // Expose role and agency on the session object
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).agencyId = token.agencyId
        ;(session.user as any).agencyName = token.agencyName
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — standard government workday session
  },
}
