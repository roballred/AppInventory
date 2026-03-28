import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const lifecycleStatusEnum = pgEnum('lifecycle_status', [
  'in_development',
  'in_production',
  'retirement_in_progress',
  'retired_from_inventory',
])

// ─── agencies ────────────────────────────────────────────────────────────────

export const agencies = pgTable('agencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  agencyNumber: varchar('agency_number', { length: 50 }).notNull().unique(),
  identityGroup: varchar('identity_group', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── applications ─────────────────────────────────────────────────────────────

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id')
    .notNull()
    .references(() => agencies.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 100 }),
  lifecycleStatus: lifecycleStatusEnum('lifecycle_status')
    .notNull()
    .default('in_production'),
  manufacturerVendor: varchar('manufacturer_vendor', { length: 255 }),
  cloudServiceProvider: varchar('cloud_service_provider', { length: 255 }),
  operatingSystem: varchar('operating_system', { length: 255 }),
  osVersion: varchar('os_version', { length: 100 }),
  contractNumber: varchar('contract_number', { length: 255 }),
  licenseNumber: varchar('license_number', { length: 255 }),
  technicalOwner: varchar('technical_owner', { length: 255 }),
  inServiceDate: date('in_service_date'),
  retirementDate: date('retirement_date'),
  isUnsupportedVersion: boolean('is_unsupported_version').default(false).notNull(),
  isUpdatable: boolean('is_updatable').default(true).notNull(),
  isAgingTechnology: boolean('is_aging_technology').default(false).notNull(),
  isAiEnabled: boolean('is_ai_enabled').default(false).notNull(),
  isGenerativeAi: boolean('is_generative_ai').default(false).notNull(),
  /**
   * Tracks when risk flags were explicitly reviewed — null means never verified since creation.
   * Risk flag fields: isUnsupportedVersion, isUpdatable, isAgingTechnology, isAiEnabled, isGenerativeAi
   */
  riskFieldsLastVerifiedAt: timestamp('risk_fields_last_verified_at'),
  lastReviewedAt: timestamp('last_reviewed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdById: varchar('created_by_id', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedById: varchar('updated_by_id', { length: 255 }).notNull(),
})

// ─── applicationAuditLog ─────────────────────────────────────────────────────

export const applicationAuditLog = pgTable('application_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  userId: varchar('user_id', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  /** Values: 'created' | 'updated' | 'retired' | 'reverted' */
  action: varchar('action', { length: 50 }).notNull(),
  /** Shape: { fieldName: { old: value, new: value } } */
  changedFields: jsonb('changed_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Exported types ───────────────────────────────────────────────────────────

export type Agency = typeof agencies.$inferSelect
export type Application = typeof applications.$inferSelect
export type ApplicationAuditLog = typeof applicationAuditLog.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type LifecycleStatus = (typeof lifecycleStatusEnum.enumValues)[number]
