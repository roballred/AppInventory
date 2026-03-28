/**
 * Test fixtures — Users
 * One fixture per role for use in unit tests, integration tests, and E2E tests.
 */

export const fixtures = {
  platformAdmin: {
    id: 'dev-platform-admin',
    name: 'Dev Platform Admin',
    email: 'platform-admin@dev.local',
    role: 'platform_admin' as const,
    agencyId: null,
    agencyName: null,
  },
  agencyAdmin: {
    id: 'dev-agency-admin',
    name: 'Dev Agency Admin',
    email: 'agency-admin@dev.local',
    role: 'agency_admin' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
  submitter: {
    id: 'dev-submitter',
    name: 'Dev Submitter',
    email: 'submitter@dev.local',
    role: 'submitter' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
  viewer: {
    id: 'dev-viewer',
    name: 'Dev Viewer',
    email: 'viewer@dev.local',
    role: 'viewer' as const,
    agencyId: 'dev-agency-001',
    agencyName: 'Dev Test Agency',
  },
}
