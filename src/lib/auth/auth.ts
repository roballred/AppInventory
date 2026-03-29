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
    async signIn({ user, account }) {
      // Upsert user record on every sign-in to keep role/agency in sync (ISSUE-22)
      // In dev bypass mode, user data comes from DEV_USERS — skip DB upsert to avoid
      // needing a real DB during unit tests.
      if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
        return true
      }
      try {
        const { db } = await import('@/lib/db')
        const { users } = await import('@/lib/db/schema')
        const { eq } = await import('drizzle-orm')
        await db
          .insert(users)
          .values({
            email: user.email ?? '',
            displayName: user.name ?? null,
            lastSignedInAt: new Date(),
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              displayName: user.name ?? null,
              lastSignedInAt: new Date(),
            },
          })
      } catch (err) {
        // Log but don't block sign-in on upsert failure
        console.error('[auth] Failed to upsert user record:', err)
      }
      return true
    },
    // KNOWN LIMITATION (ISSUE-01): Role and agencyId are embedded in the JWT at sign-in.
    // Changes made by a platform admin take effect on the user's next sign-in (max 2 hours).
    // Full server-side invalidation requires the users table (ISSUE-22).
    // See: https://github.com/roballred/AppInventory/issues/14
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
    // ISSUE-01 fix: Reduced from 8h to 2h to limit the role-revocation window.
    // If a user's role is changed by a platform admin, their existing JWT remains
    // valid until expiry — this is an accepted residual risk of up to 2 hours.
    // Full server-side session invalidation requires the users table (ISSUE-22).
    maxAge: 2 * 60 * 60, // 2 hours
  },
}
