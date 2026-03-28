/**
 * Database seed script for local development.
 *
 * Run with: tsx scripts/seed.ts
 * (Requires DATABASE_URL in .env.local)
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../src/lib/db/schema'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool, { schema })

// ─── Fixed UUIDs ─────────────────────────────────────────────────────────────

const DEV_AGENCY_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_AGENCY_ID = '00000000-0000-0000-0000-000000000002'
const CREATED_BY = 'dev-submitter'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Starting seed...')

  // ── Agencies ──────────────────────────────────────────────────────────────

  console.log('Seeding agencies...')

  const devAgency = await db
    .select()
    .from(schema.agencies)
    .where(eq(schema.agencies.id, DEV_AGENCY_ID))
    .then((rows) => rows[0])

  if (!devAgency) {
    await db.insert(schema.agencies).values({
      id: DEV_AGENCY_ID,
      name: 'Dev Test Agency',
      agencyNumber: 'DEV-001',
      identityGroup: 'dev-test-agency',
    })
    console.log('  Created: Dev Test Agency')
  } else {
    console.log('  Skipped: Dev Test Agency (already exists)')
  }

  const otherAgency = await db
    .select()
    .from(schema.agencies)
    .where(eq(schema.agencies.id, OTHER_AGENCY_ID))
    .then((rows) => rows[0])

  if (!otherAgency) {
    await db.insert(schema.agencies).values({
      id: OTHER_AGENCY_ID,
      name: 'Other State Agency',
      agencyNumber: 'OSA-002',
      identityGroup: 'other-state-agency',
    })
    console.log('  Created: Other State Agency')
  } else {
    console.log('  Skipped: Other State Agency (already exists)')
  }

  // ── Applications for Dev Test Agency ──────────────────────────────────────

  console.log('Seeding applications...')

  type AppSeed = typeof schema.applications.$inferInsert

  const devApps: AppSeed[] = [
    {
      agencyId: DEV_AGENCY_ID,
      name: 'Human Resources Portal',
      lifecycleStatus: 'in_production',
      version: '3.2.1',
      manufacturerVendor: 'Workday',
      lastReviewedAt: daysAgo(7),
      createdById: CREATED_BY,
      updatedById: CREATED_BY,
    },
    {
      agencyId: DEV_AGENCY_ID,
      name: 'Budget Tracking System',
      lifecycleStatus: 'in_production',
      version: '2.0',
      manufacturerVendor: 'Oracle',
      lastReviewedAt: daysAgo(100),
      createdById: CREATED_BY,
      updatedById: CREATED_BY,
    },
    {
      agencyId: DEV_AGENCY_ID,
      name: 'Legacy Case Management',
      lifecycleStatus: 'in_production',
      manufacturerVendor: 'IBM',
      isAgingTechnology: true,
      isUnsupportedVersion: true,
      lastReviewedAt: daysAgo(200),
      createdById: CREATED_BY,
      updatedById: CREATED_BY,
    },
    {
      agencyId: DEV_AGENCY_ID,
      name: 'Document Management System',
      lifecycleStatus: 'retirement_in_progress',
      manufacturerVendor: 'Microsoft',
      lastReviewedAt: daysAgo(30),
      createdById: CREATED_BY,
      updatedById: CREATED_BY,
    },
    {
      agencyId: DEV_AGENCY_ID,
      name: 'AI Analytics Dashboard',
      lifecycleStatus: 'in_production',
      isAiEnabled: true,
      isGenerativeAi: true,
      riskFieldsLastVerifiedAt: null,
      lastReviewedAt: daysAgo(14),
      createdById: CREATED_BY,
      updatedById: CREATED_BY,
    },
  ]

  for (const app of devApps) {
    const existing = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.name, app.name))
      .then((rows) => rows.find((r) => r.agencyId === DEV_AGENCY_ID))

    if (!existing) {
      const [inserted] = await db
        .insert(schema.applications)
        .values(app)
        .returning()

      // Create audit log entry for creation
      await db.insert(schema.applicationAuditLog).values({
        applicationId: inserted.id,
        userId: CREATED_BY,
        userEmail: 'submitter@dev.local',
        action: 'created',
        changedFields: null,
      })

      console.log(`  Created: ${app.name}`)
    } else {
      console.log(`  Skipped: ${app.name} (already exists)`)
    }
  }

  // ── Application for Other State Agency ────────────────────────────────────

  const otherApp: AppSeed = {
    agencyId: OTHER_AGENCY_ID,
    name: 'Other Agency App',
    lifecycleStatus: 'in_production',
    lastReviewedAt: daysAgo(5),
    createdById: CREATED_BY,
    updatedById: CREATED_BY,
  }

  const existingOther = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.name, otherApp.name))
    .then((rows) => rows.find((r) => r.agencyId === OTHER_AGENCY_ID))

  if (!existingOther) {
    const [inserted] = await db
      .insert(schema.applications)
      .values(otherApp)
      .returning()

    await db.insert(schema.applicationAuditLog).values({
      applicationId: inserted.id,
      userId: CREATED_BY,
      userEmail: 'submitter@dev.local',
      action: 'created',
      changedFields: null,
    })

    console.log('  Created: Other Agency App')
  } else {
    console.log('  Skipped: Other Agency App (already exists)')
  }

  // ── Business Rules ─────────────────────────────────────────────────────────

  console.log('Seeding business rules...')

  type BusinessRuleSeed = typeof schema.businessRules.$inferInsert

  const defaultRules: BusinessRuleSeed[] = [
    {
      key: 'staleness_warning_days',
      value: '90',
      description: 'Days before a record triggers a stale warning notification',
    },
    {
      key: 'staleness_critical_days',
      value: '180',
      description: 'Days before a record is critically stale and blocks certification',
    },
    {
      key: 'certification_reminder_days',
      value: '30',
      description: 'Days before certification deadline to send reminder notifications',
    },
    {
      key: 'certification_deadline_month',
      value: '9',
      description: 'Month of annual certification deadline (1-12)',
    },
    {
      key: 'certification_deadline_day',
      value: '30',
      description: 'Day of annual certification deadline',
    },
  ]

  for (const rule of defaultRules) {
    const existing = await db
      .select()
      .from(schema.businessRules)
      .where(eq(schema.businessRules.key, rule.key))
      .then((rows) => rows[0])

    if (!existing) {
      await db.insert(schema.businessRules).values(rule)
      console.log(`  Created: ${rule.key}`)
    } else {
      console.log(`  Skipped: ${rule.key} (already exists)`)
    }
  }

  console.log('Seed complete.')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  pool.end()
  process.exit(1)
})
