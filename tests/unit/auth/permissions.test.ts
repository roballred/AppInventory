/**
 * Unit tests — Role permissions
 *
 * Verifies that each role has exactly the access it should.
 * These tests are the source of truth for the permissions matrix
 * documented in roles-permissions.json.
 */

import { fixtures as users } from '../../fixtures/users'

// Helper — replace with real permission check function when built
function can(role: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    platform_admin: [
      'view_applications',
      'add_application',
      'edit_application',
      'retire_application',
      'revert_application',
      'view_audit_history',
      'submit_certification',
      'approve_certification',
      'manage_users',
      'view_all_agencies',
      'configure_business_rules',
      'export_reporting',
      'cross_agency_insights',
    ],
    agency_admin: [
      'view_applications',
      'add_application',
      'edit_application',
      'retire_application',
      'revert_application',
      'view_audit_history',
      'submit_certification',
      'manage_users',
      'export_reporting',
    ],
    submitter: [
      'view_applications',
      'add_application',
      'edit_application',
      'retire_application',
      'revert_application',
      'view_audit_history',
    ],
    viewer: [
      'view_applications',
      'view_audit_history',
    ],
  }
  return permissions[role]?.includes(action) ?? false
}

describe('platform_admin permissions', () => {
  const role = users.platformAdmin.role

  it('can view all agencies data', () => expect(can(role, 'view_all_agencies')).toBe(true))
  it('can configure business rules', () => expect(can(role, 'configure_business_rules')).toBe(true))
  it('can approve certification', () => expect(can(role, 'approve_certification')).toBe(true))
  it('can access cross-agency insights', () => expect(can(role, 'cross_agency_insights')).toBe(true))
})

describe('agency_admin permissions', () => {
  const role = users.agencyAdmin.role

  it('can submit certification', () => expect(can(role, 'submit_certification')).toBe(true))
  it('can manage users', () => expect(can(role, 'manage_users')).toBe(true))
  it('cannot approve certification', () => expect(can(role, 'approve_certification')).toBe(false))
  it('cannot view all agencies', () => expect(can(role, 'view_all_agencies')).toBe(false))
  it('cannot configure business rules', () => expect(can(role, 'configure_business_rules')).toBe(false))
})

describe('submitter permissions', () => {
  const role = users.submitter.role

  it('can add applications', () => expect(can(role, 'add_application')).toBe(true))
  it('can retire applications', () => expect(can(role, 'retire_application')).toBe(true))
  it('can revert applications', () => expect(can(role, 'revert_application')).toBe(true))
  it('cannot submit certification', () => expect(can(role, 'submit_certification')).toBe(false))
  it('cannot manage users', () => expect(can(role, 'manage_users')).toBe(false))
  it('cannot export reports', () => expect(can(role, 'export_reporting')).toBe(false))
})

describe('viewer permissions', () => {
  const role = users.viewer.role

  it('can view applications', () => expect(can(role, 'view_applications')).toBe(true))
  it('can view audit history', () => expect(can(role, 'view_audit_history')).toBe(true))
  it('cannot add applications', () => expect(can(role, 'add_application')).toBe(false))
  it('cannot edit applications', () => expect(can(role, 'edit_application')).toBe(false))
  it('cannot retire applications', () => expect(can(role, 'retire_application')).toBe(false))
})
