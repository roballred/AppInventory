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
  integer,
  unique,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const lifecycleStatusEnum = pgEnum('lifecycle_status', [
  'in_development',
  'in_production',
  'retirement_in_progress',
  'retired_from_inventory',
])

export const businessCriticalityEnum = pgEnum('business_criticality', [
  'business_essential',
  'historical',
  'mission_critical',
  'user_productivity',
])

export const coreBusinessFunctionEnum = pgEnum('core_business_function', [
  'civil_engagement_and_law',
  'commerce',
  'communications',
  'customer_service',
  'education',
  'finance',
  'fiscal_and_revenue',
  'health_and_human_services',
  'health_safety_security_environmental',
  'land_management_and_conservation',
  'legal',
  'manufacturing_and_delivery',
  'marketing_and_sales',
  'military',
  'product_management',
  'property_and_facility',
  'public_safety',
  'risk_audit_and_compliance',
  'transportation_and_infrastructure',
  'vendor_and_procurement',
  'workforce',
])

export const auditActionEnum = pgEnum('audit_action', [
  'created',
  'updated',
  'retired',
  'reverted',
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
  technicalOwnerEmail: varchar('technical_owner_email', { length: 255 }),
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
  businessCriticality: businessCriticalityEnum('business_criticality'),
  coreBusinessFunction: coreBusinessFunctionEnum('core_business_function'),
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
  action: auditActionEnum('action').notNull(),
  /** Shape: { fieldName: { old: value, new: value } } */
  changedFields: jsonb('changed_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── businessRules ────────────────────────────────────────────────────────────

export const businessRules = pgTable('business_rules', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedById: varchar('updated_by_id', { length: 255 }),
})

// ─── workQueueDismissals ──────────────────────────────────────────────────────

export const workQueueDismissals = pgTable('work_queue_dismissals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  reason: varchar('reason', { length: 50 }).notNull(), // 'stale' | 'missing_fields' | 'unverified_risk'
  dismissedAt: timestamp('dismissed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

// ─── reviewAssignments ────────────────────────────────────────────────────────

export const reviewAssignments = pgTable('review_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  assignedById: varchar('assigned_by_id', { length: 255 }).notNull(),
  assignedByEmail: varchar('assigned_by_email', { length: 255 }).notNull(),
  assignedToId: varchar('assigned_to_id', { length: 255 }).notNull(),
  assignedToEmail: varchar('assigned_to_email', { length: 255 }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  notes: text('notes'),
})

export const roleEnum = pgEnum('user_role', [
  'platform_admin',
  'agency_admin',
  'submitter',
  'viewer',
])

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  agencyId: uuid('agency_id').references(() => agencies.id),
  role: roleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSignedInAt: timestamp('last_signed_in_at'),
})

export const notificationTypeEnum = pgEnum('notification_type', [
  'staleness_warning',
  'staleness_critical',
  'certification_deadline',
  'assignment',
])

// ─── notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  /** null = broadcast to all agency users; set = targeted at a specific user */
  userId: varchar('user_id', { length: 255 }),
  type: notificationTypeEnum('type').notNull(),
  /** applicationId for staleness/assignment notifications; null for deadline */
  applicationId: uuid('application_id').references(() => applications.id),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  /** When the user read this notification; null = unread */
  readAt: timestamp('read_at'),
  /**
   * Deduplication key — prevents generating duplicate notifications for the same
   * trigger within the same day.
   * Format:
   *   staleness_warning:{applicationId}:{YYYY-MM-DD}
   *   staleness_critical:{applicationId}:{YYYY-MM-DD}
   *   certification_deadline:{agencyId}:{YYYY-MM-DD}
   *   assignment:{applicationId}:{assignedToId}:{YYYY-MM-DD}
   */
  dedupeKey: varchar('dedupe_key', { length: 500 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── certificationStatusEnum ──────────────────────────────────────────────────

export const certificationStatusEnum = pgEnum('certification_status', [
  'not_started',
  'in_progress',
  'submitted',
  'approved',
  'revision_requested',
])

// ─── certifications ───────────────────────────────────────────────────────────

export const certifications = pgTable(
  'certifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agencyId: uuid('agency_id').notNull().references(() => agencies.id),
    year: integer('year').notNull(),
    status: certificationStatusEnum('status').notNull().default('not_started'),
    submittedAt: timestamp('submitted_at'),
    submittedById: varchar('submitted_by_id', { length: 255 }),
    submittedByEmail: varchar('submitted_by_email', { length: 255 }),
    approvedAt: timestamp('approved_at'),
    approvedById: varchar('approved_by_id', { length: 255 }),
    approvedByEmail: varchar('approved_by_email', { length: 255 }),
    revisionRequestedAt: timestamp('revision_requested_at'),
    revisionNotes: text('revision_notes'),
    recordCount: integer('record_count'),
    criticalStaleCount: integer('critical_stale_count'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    agencyYearUnique: unique().on(table.agencyId, table.year),
  })
)

// ─── Exported types ───────────────────────────────────────────────────────────

export type Agency = typeof agencies.$inferSelect
export type Application = typeof applications.$inferSelect
export type ApplicationAuditLog = typeof applicationAuditLog.$inferSelect
export type BusinessRule = typeof businessRules.$inferSelect
export type WorkQueueDismissal = typeof workQueueDismissals.$inferSelect
export type ReviewAssignment = typeof reviewAssignments.$inferSelect
export type Certification = typeof certifications.$inferSelect
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type NewApplication = typeof applications.$inferInsert
export type LifecycleStatus = (typeof lifecycleStatusEnum.enumValues)[number]
export type BusinessCriticality = (typeof businessCriticalityEnum.enumValues)[number]
export type CoreBusinessFunction = (typeof coreBusinessFunctionEnum.enumValues)[number]
export type CertificationStatus = (typeof certificationStatusEnum.enumValues)[number]
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number]
