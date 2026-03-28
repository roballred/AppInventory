/**
 * Server-side role enforcement utility.
 * Reads role from JWT (current behavior).
 * NOTE: Role comes from JWT — changes take effect on next sign-in (max 8 hours).
 * Before CAP-05 (certification sign-off), add server-side role re-validation
 * for the certification submit and approve operations.
 */

import type { Session } from 'next-auth'

export function requireRole(
  session: Session | null,
  allowedRoles: string[]
): { authorized: boolean; error?: string } {
  if (!session) {
    return { authorized: false, error: 'Unauthorized' }
  }

  const role = (session.user as any).role as string | undefined

  if (!role || !allowedRoles.includes(role)) {
    return { authorized: false, error: 'Forbidden' }
  }

  return { authorized: true }
}
