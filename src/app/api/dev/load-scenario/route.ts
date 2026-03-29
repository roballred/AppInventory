import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { eq, inArray } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import {
  applications,
  applicationAuditLog,
  workQueueDismissals,
  reviewAssignments,
  certifications,
} from '@/lib/db/schema'

// Dev bypass guard — never available in production
const isDevBypass =
  process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'

const DEV_AGENCY_ID = '00000000-0000-0000-0000-000000000001'
const SEED_USER = 'dev-submitter'
const SEED_EMAIL = 'submitter@dev.local'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

// ── Scenario definitions ────────────────────────────────────────────────────

type AppTemplate = {
  name: string
  lifecycleStatus: 'in_development' | 'in_production' | 'retirement_in_progress' | 'retired_from_inventory'
  manufacturerVendor?: string
  version?: string
  lastReviewedDaysAgo: number
  isAgingTechnology?: boolean
  isUnsupportedVersion?: boolean
  isAiEnabled?: boolean
  isGenerativeAi?: boolean
  riskFieldsLastVerifiedAt?: Date | null
}

type CertTemplate = {
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested'
  submittedAt?: Date
  approvedAt?: Date
  recordCount?: number
  criticalStaleCount?: number
}

type Scenario = {
  label: string
  description: string
  apps: AppTemplate[]
  certification?: CertTemplate
}

const SCENARIOS: Record<string, Scenario> = {
  clean: {
    label: 'Clean Slate',
    description: 'All records recently reviewed. No stale records. Certification not started.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', version: '3.2.1', lastReviewedDaysAgo: 3 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', version: '2.0', lastReviewedDaysAgo: 7 },
      { name: 'Case Management System', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', lastReviewedDaysAgo: 5 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 2 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, isGenerativeAi: true, lastReviewedDaysAgo: 1, riskFieldsLastVerifiedAt: daysAgo(1) },
    ],
  },

  default: {
    label: 'Default Mix',
    description: 'Standard seed: one current, one warning, one critical, one retirement, one AI with unverified risk flags.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', version: '3.2.1', lastReviewedDaysAgo: 7 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', version: '2.0', lastReviewedDaysAgo: 100 },
      { name: 'Legacy Case Management', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', isAgingTechnology: true, isUnsupportedVersion: true, lastReviewedDaysAgo: 200 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 30 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, isGenerativeAi: true, lastReviewedDaysAgo: 14, riskFieldsLastVerifiedAt: null },
    ],
  },

  certification_ready: {
    label: 'Certification Ready',
    description: 'Some warning-level stale records, zero critical. Certification not started — ready to begin the process.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', lastReviewedDaysAgo: 10 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', lastReviewedDaysAgo: 95 },
      { name: 'Case Management System', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', lastReviewedDaysAgo: 110 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 5 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, lastReviewedDaysAgo: 15, riskFieldsLastVerifiedAt: daysAgo(15) },
    ],
  },

  certification_blocked: {
    label: 'Certification Blocked',
    description: '3 critically stale records (180+ days) blocking submission. Certification in progress.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', lastReviewedDaysAgo: 200 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', lastReviewedDaysAgo: 220 },
      { name: 'Legacy Case Management', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', isAgingTechnology: true, lastReviewedDaysAgo: 185 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 10 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, lastReviewedDaysAgo: 20, riskFieldsLastVerifiedAt: daysAgo(20) },
    ],
    certification: { status: 'in_progress' },
  },

  ready_to_submit: {
    label: 'Ready to Submit',
    description: 'Zero critical stale records. Certification in progress — proceed to attestation step.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', lastReviewedDaysAgo: 5 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', lastReviewedDaysAgo: 8 },
      { name: 'Case Management System', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', lastReviewedDaysAgo: 3 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 12 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, lastReviewedDaysAgo: 4, riskFieldsLastVerifiedAt: daysAgo(4) },
    ],
    certification: { status: 'in_progress' },
  },

  certified: {
    label: 'Certified (Approved)',
    description: 'Certification submitted and approved for the current year. All records current.',
    apps: [
      { name: 'Human Resources Portal', lifecycleStatus: 'in_production', manufacturerVendor: 'Workday', lastReviewedDaysAgo: 5 },
      { name: 'Budget Tracking System', lifecycleStatus: 'in_production', manufacturerVendor: 'Oracle', lastReviewedDaysAgo: 8 },
      { name: 'Case Management System', lifecycleStatus: 'in_production', manufacturerVendor: 'IBM', lastReviewedDaysAgo: 3 },
      { name: 'Document Management System', lifecycleStatus: 'retirement_in_progress', manufacturerVendor: 'Microsoft', lastReviewedDaysAgo: 12 },
      { name: 'AI Analytics Dashboard', lifecycleStatus: 'in_production', isAiEnabled: true, lastReviewedDaysAgo: 4, riskFieldsLastVerifiedAt: daysAgo(4) },
    ],
    certification: {
      status: 'approved',
      submittedAt: daysAgo(15),
      approvedAt: daysAgo(10),
      recordCount: 5,
      criticalStaleCount: 0,
    },
  },
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isDevBypass) {
    return NextResponse.json({ error: 'Not available outside dev bypass mode' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { scenario: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const scenario = SCENARIOS[body.scenario]
  if (!scenario) {
    return NextResponse.json(
      { error: `Unknown scenario "${body.scenario}". Valid: ${Object.keys(SCENARIOS).join(', ')}` },
      { status: 400 }
    )
  }

  // ── Reset: delete existing data for the dev agency ──────────────────────

  // Get app IDs first (needed for FK-dependent deletes)
  const existingApps = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.agencyId, DEV_AGENCY_ID))

  const appIds = existingApps.map((a) => a.id)

  if (appIds.length > 0) {
    await db.delete(workQueueDismissals).where(inArray(workQueueDismissals.applicationId, appIds))
    await db.delete(reviewAssignments).where(inArray(reviewAssignments.applicationId, appIds))
    await db.delete(applicationAuditLog).where(inArray(applicationAuditLog.applicationId, appIds))
  }

  await db.delete(applications).where(eq(applications.agencyId, DEV_AGENCY_ID))
  await db.delete(certifications).where(eq(certifications.agencyId, DEV_AGENCY_ID))

  // ── Insert new apps ──────────────────────────────────────────────────────

  const year = new Date().getFullYear()

  for (const tmpl of scenario.apps) {
    const reviewedAt = daysAgo(tmpl.lastReviewedDaysAgo)
    const [inserted] = await db
      .insert(applications)
      .values({
        agencyId: DEV_AGENCY_ID,
        name: tmpl.name,
        lifecycleStatus: tmpl.lifecycleStatus,
        manufacturerVendor: tmpl.manufacturerVendor ?? null,
        version: tmpl.version ?? null,
        isAgingTechnology: tmpl.isAgingTechnology ?? false,
        isUnsupportedVersion: tmpl.isUnsupportedVersion ?? false,
        isAiEnabled: tmpl.isAiEnabled ?? false,
        isGenerativeAi: tmpl.isGenerativeAi ?? false,
        riskFieldsLastVerifiedAt: 'riskFieldsLastVerifiedAt' in tmpl ? tmpl.riskFieldsLastVerifiedAt : null,
        lastReviewedAt: reviewedAt,
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
        createdById: SEED_USER,
        updatedById: SEED_USER,
      })
      .returning()

    await db.insert(applicationAuditLog).values({
      applicationId: inserted.id,
      userId: SEED_USER,
      userEmail: SEED_EMAIL,
      action: 'created',
      changedFields: null,
    })
  }

  // ── Insert certification if scenario defines one ─────────────────────────

  if (scenario.certification) {
    const cert = scenario.certification
    await db.insert(certifications).values({
      agencyId: DEV_AGENCY_ID,
      year,
      status: cert.status,
      submittedAt: cert.submittedAt ?? null,
      submittedById: cert.submittedAt ? 'dev-agency-admin' : null,
      submittedByEmail: cert.submittedAt ? 'agency-admin@dev.local' : null,
      approvedAt: cert.approvedAt ?? null,
      approvedById: cert.approvedAt ? 'dev-platform-admin' : null,
      approvedByEmail: cert.approvedAt ? 'platform-admin@dev.local' : null,
      recordCount: cert.recordCount ?? null,
      criticalStaleCount: cert.criticalStaleCount ?? null,
    })
  }

  return NextResponse.json({ ok: true, scenario: body.scenario, label: scenario.label })
}

// Also expose scenario metadata for the UI
export async function GET() {
  if (!isDevBypass) {
    return NextResponse.json({ error: 'Not available outside dev bypass mode' }, { status: 403 })
  }

  const meta = Object.entries(SCENARIOS).map(([key, s]) => ({
    key,
    label: s.label,
    description: s.description,
    appCount: s.apps.length,
    hasCertification: !!s.certification,
    certificationStatus: s.certification?.status ?? null,
  }))

  return NextResponse.json(meta)
}
