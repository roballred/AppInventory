import type { Session } from 'next-auth'

/**
 * Permission helpers based on the roles-permissions matrix.
 *
 * Roles:
 *   platform_admin — all agencies, all actions
 *   agency_admin   — own agency, all actions except approve certification / cross-agency
 *   submitter      — own agency, can view/add/edit/retire/revert applications
 *   viewer         — own agency, read-only
 */

type UserRole = 'platform_admin' | 'agency_admin' | 'submitter' | 'viewer'

function getRole(session: Session): UserRole {
  return (session.user as any).role as UserRole
}

/** All authenticated roles can view applications (within their agency scope). */
export function canViewApplications(session: Session): boolean {
  const role = getRole(session)
  return ['platform_admin', 'agency_admin', 'submitter', 'viewer'].includes(role)
}

/** platform_admin, agency_admin, and submitter can add and edit applications. */
export function canEditApplication(session: Session): boolean {
  const role = getRole(session)
  return ['platform_admin', 'agency_admin', 'submitter'].includes(role)
}

/** platform_admin, agency_admin, and submitter can retire/revert applications. */
export function canRetireApplication(session: Session): boolean {
  const role = getRole(session)
  return ['platform_admin', 'agency_admin', 'submitter'].includes(role)
}

/**
 * Returns true for all roles that are scoped to a single agency.
 * Only platform_admin sees all agencies; every other role is agency-scoped.
 */
export function isAgencyScopedUser(session: Session): boolean {
  return getRole(session) !== 'platform_admin'
}

/**
 * Returns the agencyId filter for database queries.
 * - platform_admin: returns null (no filter — all agencies)
 * - all other roles: returns the user's agencyId
 */
export function getAgencyFilter(session: Session): string | null {
  if (!isAgencyScopedUser(session)) return null
  return (session.user as any).agencyId as string | null
}
