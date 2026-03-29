/**
 * Data Quality Monitoring computation for CAP-08.
 *
 * Measures completeness and risk-verification coverage across all agencies.
 * "Optional but important" fields are tracked for completeness scoring.
 * Risk-flagged apps with no verification date are surfaced separately.
 */

import { ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, agencies } from '@/lib/db/schema'
import type { Agency, Application } from '@/lib/db/schema'

// ── Fields tracked for completeness ──────────────────────────────────────────
// Required fields (name, lifecycleStatus, version, manufacturerVendor,
// technicalOwner, inServiceDate) are enforced at creation — not tracked here.
// These are the "optional but important" fields that affect data quality.

export interface QualityField {
  key: keyof Application
  label: string
  description: string
}

export const QUALITY_FIELDS: QualityField[] = [
  { key: 'description', label: 'Description', description: 'What the application does' },
  { key: 'technicalOwnerEmail', label: 'Technical Owner Email', description: 'Contact for automated notifications' },
  { key: 'businessCriticality', label: 'Business Criticality', description: 'Mission critical, essential, etc.' },
  { key: 'coreBusinessFunction', label: 'Core Business Function', description: 'Business area classification' },
  { key: 'operatingSystem', label: 'Operating System', description: 'OS platform for the application' },
  { key: 'contractNumber', label: 'Contract Number', description: 'Procurement contract reference' },
]

// ── Per-agency data quality row ───────────────────────────────────────────────

export interface AgencyQualityRow {
  agency: Agency
  activeApps: number
  /** Apps with at least one missing quality field */
  appsWithGaps: number
  /** Total filled fields / total possible fields across all active apps */
  completenessScore: number // 0–100
  /** Active apps with risk flags but no riskFieldsLastVerifiedAt */
  unverifiedRiskCount: number
  /** Per-field miss counts */
  fieldMisses: Record<string, number>
}

// ── Portfolio-wide field coverage ─────────────────────────────────────────────

export interface FieldCoverage {
  field: QualityField
  filled: number
  missing: number
  coveragePct: number
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface DataQualitySummary {
  totalAgencies: number
  totalActiveApps: number
  totalAppsWithGaps: number
  totalUnverifiedRisk: number
  overallCompleteness: number // 0–100
  fieldCoverage: FieldCoverage[]
  agencyRows: AgencyQualityRow[]
  /** Cross-agency list of unverified risk apps, sorted by agency then name */
  unverifiedRiskApps: Array<{ app: Application; agency: Agency }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPresent(val: unknown): boolean {
  return val !== null && val !== undefined && val !== ''
}

function hasRiskFlag(app: Application): boolean {
  return app.isAiEnabled || app.isGenerativeAi || app.isAgingTechnology || app.isUnsupportedVersion
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function computeDataQuality(): Promise<DataQualitySummary> {
  const [allAgencies, allApps] = await Promise.all([
    db.select().from(agencies),
    db
      .select()
      .from(applications)
      .where(ne(applications.lifecycleStatus, 'retired_from_inventory')),
  ])

  const agencyMap = new Map(allAgencies.map((a) => [a.id, a]))

  // Portfolio-wide field miss counters
  const portfolioFieldMisses: Record<string, number> = {}
  for (const f of QUALITY_FIELDS) portfolioFieldMisses[f.key as string] = 0

  let totalAppsWithGaps = 0
  let totalUnverifiedRisk = 0
  let totalFilledSlots = 0
  const totalPossibleSlots = allApps.length * QUALITY_FIELDS.length

  // Unverified risk apps (cross-agency)
  const unverifiedRiskApps: Array<{ app: Application; agency: Agency }> = []

  // Per-agency accumulation
  const agencyAccum = new Map<
    string,
    { activeApps: number; appsWithGaps: number; filledSlots: number; unverifiedRisk: number; fieldMisses: Record<string, number> }
  >()

  for (const agency of allAgencies) {
    agencyAccum.set(agency.id, {
      activeApps: 0,
      appsWithGaps: 0,
      filledSlots: 0,
      unverifiedRisk: 0,
      fieldMisses: Object.fromEntries(QUALITY_FIELDS.map((f) => [f.key as string, 0])),
    })
  }

  for (const app of allApps) {
    const acc = agencyAccum.get(app.agencyId)
    if (!acc) continue

    acc.activeApps++

    let appFilled = 0
    let appMissing = 0

    for (const f of QUALITY_FIELDS) {
      const val = app[f.key]
      if (isPresent(val)) {
        appFilled++
        totalFilledSlots++
        acc.filledSlots++
      } else {
        appMissing++
        portfolioFieldMisses[f.key as string]++
        acc.fieldMisses[f.key as string]++
      }
    }

    if (appMissing > 0) {
      totalAppsWithGaps++
      acc.appsWithGaps++
    }

    if (hasRiskFlag(app) && !app.riskFieldsLastVerifiedAt) {
      totalUnverifiedRisk++
      acc.unverifiedRisk++
      const agency = agencyMap.get(app.agencyId)
      if (agency) {
        unverifiedRiskApps.push({ app, agency })
      }
    }
  }

  // Sort unverified risk: agency name, then app name
  unverifiedRiskApps.sort((a, b) =>
    a.agency.name.localeCompare(b.agency.name) || a.app.name.localeCompare(b.app.name)
  )

  // Build agency rows
  const agencyRows: AgencyQualityRow[] = allAgencies.map((agency) => {
    const acc = agencyAccum.get(agency.id)!
    const possibleSlots = acc.activeApps * QUALITY_FIELDS.length
    const completenessScore = possibleSlots === 0
      ? 100
      : Math.round((acc.filledSlots / possibleSlots) * 100)

    return {
      agency,
      activeApps: acc.activeApps,
      appsWithGaps: acc.appsWithGaps,
      completenessScore,
      unverifiedRiskCount: acc.unverifiedRisk,
      fieldMisses: acc.fieldMisses,
    }
  })

  // Sort: lowest completeness first
  agencyRows.sort((a, b) => a.completenessScore - b.completenessScore)

  // Field coverage sorted by least covered first
  const fieldCoverage: FieldCoverage[] = QUALITY_FIELDS.map((field) => {
    const missing = portfolioFieldMisses[field.key as string]
    const filled = allApps.length - missing
    const coveragePct = allApps.length === 0 ? 100 : Math.round((filled / allApps.length) * 100)
    return { field, filled, missing, coveragePct }
  }).sort((a, b) => a.coveragePct - b.coveragePct)

  const overallCompleteness = totalPossibleSlots === 0
    ? 100
    : Math.round((totalFilledSlots / totalPossibleSlots) * 100)

  return {
    totalAgencies: allAgencies.length,
    totalActiveApps: allApps.length,
    totalAppsWithGaps,
    totalUnverifiedRisk,
    overallCompleteness,
    fieldCoverage,
    agencyRows,
    unverifiedRiskApps,
  }
}
