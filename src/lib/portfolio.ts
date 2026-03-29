/**
 * Portfolio Intelligence computation for CAP-07.
 *
 * Cross-agency analytics for platform admins. All data is computed
 * directly from the database — no stored aggregates.
 */

import { eq, ne, isNotNull, count, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, agencies, certifications } from '@/lib/db/schema'
import type { Agency, CertificationStatus } from '@/lib/db/schema'
import { getStalenessThresholds } from '@/lib/business-rules'
import { getCurrentCertificationYear } from '@/lib/certification'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgencyHealthRow {
  agency: Agency
  totalApps: number
  activeApps: number
  retiredApps: number
  criticalCount: number
  warningCount: number
  currentCount: number
  aiCount: number
  generativeAiCount: number
  agingCount: number
  unsupportedCount: number
  certStatus: CertificationStatus | null
  healthScore: number // 0–100
}

export interface VendorCount {
  vendor: string
  count: number
}

export interface PortfolioSummary {
  totalAgencies: number
  totalApps: number
  totalActiveApps: number
  totalRetiredApps: number
  totalCritical: number
  totalWarning: number
  totalCurrent: number
  totalAiEnabled: number
  totalGenerativeAi: number
  totalAging: number
  totalUnsupported: number
  certYear: number
  certificationSummary: Record<CertificationStatus | 'no_record', number>
  topVendors: VendorCount[]
  lifecycleDistribution: Record<string, number>
  agencyRows: AgencyHealthRow[]
}

// ── Health score calculation ───────────────────────────────────────────────────
// 100 base. Penalties:
//   -20 per critical stale app, max -60
//   -5 per warning stale app, max -20
//   -10 per unverified risk flag (aging/unsupported/AI with no verification)
// Certification bonus/penalty:
//   not_started: -10
//   approved: +10
//   in_progress, submitted, revision_requested: neutral (0)
// Floor: 0, ceiling: 100

function computeHealthScore(row: Omit<AgencyHealthRow, 'healthScore'>, certStatus: CertificationStatus | null): number {
  let score = 100
  score -= Math.min(row.criticalCount * 20, 60)
  score -= Math.min(row.warningCount * 5, 20)
  if (certStatus === 'not_started') score -= 10
  if (certStatus === 'approved') score += 10
  return Math.max(0, Math.min(100, score))
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function computePortfolioIntelligence(): Promise<PortfolioSummary> {
  const [thresholds, certYear, allAgencies, allApps, allCerts, topVendorsRaw] = await Promise.all([
    getStalenessThresholds(),
    getCurrentCertificationYear(),
    db.select().from(agencies),
    db.select().from(applications),
    db.select().from(certifications),
    db
      .select({ vendor: applications.manufacturerVendor, cnt: count() })
      .from(applications)
      .where(
        and(
          isNotNull(applications.manufacturerVendor),
          ne(applications.lifecycleStatus, 'retired_from_inventory')
        )
      )
      .groupBy(applications.manufacturerVendor)
      .orderBy(desc(count()))
      .limit(10),
  ])

  const now = Date.now()
  const warnCutoff = new Date(now - thresholds.warning * 24 * 60 * 60 * 1000)
  const critCutoff = new Date(now - thresholds.critical * 24 * 60 * 60 * 1000)

  // Cert map: agencyId -> cert for current year
  const certMap = new Map(
    allCerts.filter((c) => c.year === certYear).map((c) => [c.agencyId, c])
  )

  // Lifecycle distribution across all apps
  const lifecycleDistribution: Record<string, number> = {}
  for (const app of allApps) {
    lifecycleDistribution[app.lifecycleStatus] = (lifecycleDistribution[app.lifecycleStatus] ?? 0) + 1
  }

  // Certification summary
  const certStatuses: Array<CertificationStatus | 'no_record'> = [
    'not_started', 'in_progress', 'submitted', 'approved', 'revision_requested', 'no_record'
  ]
  const certificationSummary: Record<CertificationStatus | 'no_record', number> = {
    not_started: 0, in_progress: 0, submitted: 0, approved: 0, revision_requested: 0, no_record: 0
  }
  for (const agency of allAgencies) {
    const cert = certMap.get(agency.id)
    if (!cert) {
      certificationSummary['no_record']++
    } else {
      certificationSummary[cert.status]++
    }
  }

  // Per-agency rows
  const agencyRows: AgencyHealthRow[] = []

  let totalCritical = 0
  let totalWarning = 0
  let totalCurrent = 0
  let totalAiEnabled = 0
  let totalGenerativeAi = 0
  let totalAging = 0
  let totalUnsupported = 0

  for (const agency of allAgencies) {
    const agencyApps = allApps.filter((a) => a.agencyId === agency.id)
    const activeApps = agencyApps.filter((a) => a.lifecycleStatus !== 'retired_from_inventory')
    const retiredApps = agencyApps.filter((a) => a.lifecycleStatus === 'retired_from_inventory')

    let criticalCount = 0
    let warningCount = 0
    let currentCount = 0
    let aiCount = 0
    let generativeAiCount = 0
    let agingCount = 0
    let unsupportedCount = 0

    for (const app of activeApps) {
      if (app.lastReviewedAt < critCutoff) {
        criticalCount++
      } else if (app.lastReviewedAt < warnCutoff) {
        warningCount++
      } else {
        currentCount++
      }
      if (app.isAiEnabled) aiCount++
      if (app.isGenerativeAi) generativeAiCount++
      if (app.isAgingTechnology) agingCount++
      if (app.isUnsupportedVersion) unsupportedCount++
    }

    totalCritical += criticalCount
    totalWarning += warningCount
    totalCurrent += currentCount
    totalAiEnabled += aiCount
    totalGenerativeAi += generativeAiCount
    totalAging += agingCount
    totalUnsupported += unsupportedCount

    const cert = certMap.get(agency.id)
    const certStatus = cert?.status ?? null

    const partial = {
      agency,
      totalApps: agencyApps.length,
      activeApps: activeApps.length,
      retiredApps: retiredApps.length,
      criticalCount,
      warningCount,
      currentCount,
      aiCount,
      generativeAiCount,
      agingCount,
      unsupportedCount,
      certStatus,
    }

    agencyRows.push({
      ...partial,
      healthScore: computeHealthScore(partial, certStatus),
    })
  }

  // Sort: lowest health score first (most attention needed at top)
  agencyRows.sort((a, b) => a.healthScore - b.healthScore)

  const topVendors: VendorCount[] = topVendorsRaw.map((r) => ({
    vendor: r.vendor ?? 'Unknown',
    count: Number(r.cnt),
  }))

  const totalActiveApps = totalCritical + totalWarning + totalCurrent
  const totalApps = allApps.length

  return {
    totalAgencies: allAgencies.length,
    totalApps,
    totalActiveApps,
    totalRetiredApps: totalApps - totalActiveApps,
    totalCritical,
    totalWarning,
    totalCurrent,
    totalAiEnabled,
    totalGenerativeAi,
    totalAging,
    totalUnsupported,
    certYear,
    certificationSummary,
    topVendors,
    lifecycleDistribution,
    agencyRows,
  }
}
