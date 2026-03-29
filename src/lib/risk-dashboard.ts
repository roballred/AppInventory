/**
 * Risk dashboard computation library for CAP-10.
 *
 * Derives the risk categories for an agency's applications in real time.
 * No stored table — everything is computed from application records and
 * the business rules thresholds.
 */

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, reviewAssignments } from '@/lib/db/schema'
import type { Application, ReviewAssignment } from '@/lib/db/schema'
import { getDaysSinceReview } from '@/lib/staleness'

// ─── Public types ─────────────────────────────────────────────────────────────

export type RiskCategory = 'aging' | 'unsupported' | 'ai' | 'approaching_staleness'

export interface RiskItem {
  application: Application
  category: RiskCategory
  categoryLabel: string
  isUnverified: boolean
  daysUntilCritical?: number
  openAssignment?: ReviewAssignment
}

export interface RiskDashboardData {
  aging: RiskItem[]
  unsupported: RiskItem[]
  ai: RiskItem[]
  approachingStaleness: RiskItem[]
  totalAtRisk: number
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  aging: 'Aging Technology',
  unsupported: 'Unsupported Version',
  ai: 'AI-Enabled',
  approaching_staleness: 'Approaching Staleness',
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the risk dashboard for a specific agency.
 *
 * 1. Fetches all non-retired applications for the agency.
 * 2. Fetches all open review assignments for those applications.
 * 3. Classifies each application into one or more risk categories.
 * 4. Returns categorized lists and a total unique at-risk application count.
 */
export async function computeRiskDashboard(
  agencyId: string,
  thresholds: { warning: number; critical: number }
): Promise<RiskDashboardData> {
  // 1. Fetch all non-retired applications for this agency
  const allApps = await db
    .select()
    .from(applications)
    .where(eq(applications.agencyId, agencyId))

  const activeApps = allApps.filter(
    (app) => app.lifecycleStatus !== 'retired_from_inventory'
  )

  // 2. Fetch all open review assignments for these applications
  // (resolvedAt IS NULL = still open)
  const appIds = activeApps.map((app) => app.id)

  let openAssignments: ReviewAssignment[] = []
  if (appIds.length > 0) {
    // Fetch all open assignments for this agency's apps
    const allOpenAssignments = await db
      .select()
      .from(reviewAssignments)
      .where(isNull(reviewAssignments.resolvedAt))

    // Filter to only apps in this agency (in-memory for simplicity)
    const appIdSet = new Set(appIds)
    openAssignments = allOpenAssignments.filter((a) =>
      appIdSet.has(a.applicationId)
    )
  }

  // Build a map of applicationId → open assignment for O(1) lookup
  const assignmentMap = new Map<string, ReviewAssignment>()
  for (const assignment of openAssignments) {
    // If multiple open assignments exist, take the most recent one
    const existing = assignmentMap.get(assignment.applicationId)
    if (!existing || assignment.assignedAt > existing.assignedAt) {
      assignmentMap.set(assignment.applicationId, assignment)
    }
  }

  // 3. Classify each application into risk categories

  const aging: RiskItem[] = []
  const unsupported: RiskItem[] = []
  const ai: RiskItem[] = []
  const approachingStaleness: RiskItem[] = []
  const atRiskIds = new Set<string>()

  for (const app of activeApps) {
    const isUnverified = app.riskFieldsLastVerifiedAt === null
    const openAssignment = assignmentMap.get(app.id)
    const days = getDaysSinceReview(app.lastReviewedAt)
    const daysUntilCritical = thresholds.critical - days

    // Aging: isAgingTechnology=true OR isUnsupportedVersion=true
    if (app.isAgingTechnology || app.isUnsupportedVersion) {
      aging.push({
        application: app,
        category: 'aging',
        categoryLabel: CATEGORY_LABELS.aging,
        isUnverified,
        openAssignment,
      })
      atRiskIds.add(app.id)
    }

    // Unsupported: isUnsupportedVersion=true
    if (app.isUnsupportedVersion) {
      unsupported.push({
        application: app,
        category: 'unsupported',
        categoryLabel: CATEGORY_LABELS.unsupported,
        isUnverified,
        openAssignment,
      })
      atRiskIds.add(app.id)
    }

    // AI: isAiEnabled=true OR isGenerativeAi=true
    if (app.isAiEnabled || app.isGenerativeAi) {
      ai.push({
        application: app,
        category: 'ai',
        categoryLabel: CATEGORY_LABELS.ai,
        isUnverified,
        openAssignment,
      })
      atRiskIds.add(app.id)
    }

    // Approaching staleness: days since review is between (critical - 30) and critical
    // i.e., currently warning-level but will become critical within 30 days
    if (days >= thresholds.critical - 30 && days < thresholds.critical) {
      approachingStaleness.push({
        application: app,
        category: 'approaching_staleness',
        categoryLabel: CATEGORY_LABELS.approaching_staleness,
        isUnverified: false, // never unverified for staleness category
        daysUntilCritical: Math.max(0, daysUntilCritical),
        openAssignment,
      })
      atRiskIds.add(app.id)
    }
  }

  return {
    aging,
    unsupported,
    ai,
    approachingStaleness,
    totalAtRisk: atRiskIds.size,
  }
}
