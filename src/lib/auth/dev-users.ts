/**
 * Dev and test user accounts.
 *
 * These accounts are ONLY available when AUTH_BYPASS=true in .env.local.
 * They are never loaded in production (NODE_ENV === 'production').
 *
 * One account per role so any flow can be tested without a real identity provider.
 */

export const DEV_USERS = [
  {
    id: 'dev-platform-admin',
    name: 'Dev Platform Admin',
    email: 'platform-admin@dev.local',
    role: 'platform_admin' as const,
    agencyId: null, // platform_admin has cross-agency access
    agencyName: null,
  },
  {
    id: 'dev-agency-admin',
    name: 'Dev Agency Admin',
    email: 'agency-admin@dev.local',
    role: 'agency_admin' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
  {
    id: 'dev-submitter',
    name: 'Dev Submitter',
    email: 'submitter@dev.local',
    role: 'submitter' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
  {
    id: 'dev-viewer',
    name: 'Dev Viewer',
    email: 'viewer@dev.local',
    role: 'viewer' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
]

export type DevUser = (typeof DEV_USERS)[number]
