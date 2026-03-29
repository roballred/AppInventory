/**
 * Work queue computation library for CAP-09.
 *
 * Derives the prioritized list of records Jordan needs to action,
 * excluding dismissed items and retired applications.
 */

import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, workQueueDismissals, reviewAssignments } from '@/lib/db/schema'
import type { Application } from '@/lib/db/schema'
import { getDaysSinceReview } from '@/lib/staleness'

// ─── Public types ─────────────────────────────────────────────────────────────

export type QueueItemReason = 'assigned' | 'critical' | 'warning' | 'missing_fields' | 'unverified_risk'
export type EffortLevel = 'quick' | 'research'

export interface WorkQueueItem {
  application: Application
  reason: QueueItemReason
  reasonLabel: string
  effortLevel: EffortLevel
  effortLabel: string
  daysStale?: number
  missingFields?: string[]
}

// ─── Field classification ─────────────────────────────────────────────────────

/**
 * Required fields — records missing any of these appear in the missing_fields tier.
 * Keys must match the Application type.
 */
const REQUIRED_FIELD_KEYS: (keyof Application)[] = [
  'name',
  'lifecycleStatus',
  'version',
  'manufacturerVendor',
  'technicalOwner',
  'inServiceDate',
]

/**
 * Human-readable labels for required fields shown in the reason label.
 */
const FIELD_LABELS: Partial<Record<keyof Application, string>> = {
  name: 'Application name',
  lifecycleStatus: 'Lifecycle status',
  version: 'Version',
  manufacturerVendor: 'Manufacturer / Vendor',
  technicalOwner: 'Technical owner',
  inServiceDate: 'In-service date',
  description: 'Description',
  cloudServiceProvider: 'Cloud service provider',
  retirementDate: 'Retirement date',
  isAiEnabled: 'AI Enabled',
  isGenerativeAi: 'Generative AI',
  isUpdatable: 'Updatable',
  businessCriticality: 'Business criticality',
  coreBusinessFunction: 'Core business function',
  contractNumber: 'Contract number',
  licenseNumber: 'License number',
  operatingSystem: 'Operating system',
  osVersion: 'OS version',
  isUnsupportedVersion: 'Unsupported version',
  isAgingTechnology: 'Aging technology',
  technicalOwnerEmail: 'Technical owner email',
}

/**
 * Lookup fields: Jordan can confirm without external research.
 */
const LOOKUP_FIELD_KEYS = new Set<keyof Application>([
  'name',
  'description',
  'lifecycleStatus',
  'version',
  'cloudServiceProvider',
  'inServiceDate',
  'retirementDate',
  'isAiEnabled',
  'isGenerativeAi',
  'isUpdatable',
  'businessCriticality',
  'coreBusinessFunction',
])

/**
 * Research fields: requires vendor docs, procurement records, or support matrices.
 */
const RESEARCH_FIELD_KEYS = new Set<keyof Application>([
  'manufacturerVendor',
  'contractNumber',
  'licenseNumber',
  'operatingSystem',
  'osVersion',
  'technicalOwner',
  'technicalOwnerEmail',
  'isUnsupportedVersion',
  'isAgingTechnology',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the effort level for a set of field keys that need attention.
 * If any field is a research field → 'research'. Otherwise → 'quick'.
 */
function computeEffort(fieldKeys: (keyof Application)[]): EffortLevel {
  for (const key of fieldKeys) {
    if (RESEARCH_FIELD_KEYS.has(key)) return 'research'
  }
  return 'quick'
}

/**
 * Returns the subset of required fields that are blank on this application.
 */
function getMissingRequiredFields(app: Application): (keyof Application)[] {
  return REQUIRED_FIELD_KEYS.filter((key) => {
    const val = app[key]
    return val === null || val === undefined || (typeof val === 'string' && !val.trim())
  })
}

/**
 * Returns a human-readable label for a list of field keys.
 */
function fieldLabel(key: keyof Application): string {
  return FIELD_LABELS[key] ?? String(key)
}

// ─── Staleness reason label ────────────────────────────────────────────────────

function buildStalenessLabel(days: number, level: 'critical' | 'warning'): string {
  if (level === 'critical') {
    return `Not reviewed in ${days} days — critically stale`
  }
  return `Not reviewed in ${days} days — stale`
}

// ─── Priority sort order ───────────────────────────────────────────────────────

const REASON_ORDER: Record<QueueItemReason, number> = {
  assigned: 0,
  critical: 1,
  warning: 2,
  missing_fields: 3,
  unverified_risk: 4,
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the work queue for a specific user and agency.
 *
 * 1. Fetches all non-retired applications for the agency.
 * 2. Fetches active (non-expired) dismissals for this user.
 * 3. Classifies each application into the highest-priority reason tier.
 * 4. Filters out dismissed items.
 * 5. Returns the sorted list (by reason priority, then oldest first within each tier).
 */
export async function computeWorkQueue(
  agencyId: string,
  userId: string,
  thresholds: { warning: number; critical: number }
): Promise<WorkQueueItem[]> {
  // 1. Fetch all non-retired applications for this agency
  const apps = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.agencyId, agencyId),
        // retired_from_inventory records never appear in the work queue
        // We fetch all and filter in JS to avoid needing a 'not equals' import
      )
    )

  const activeApps = apps.filter((app) => app.lifecycleStatus !== 'retired_from_inventory')

  // 2. Fetch active dismissals for this user (not yet expired)
  const now = new Date()
  const dismissals = await db
    .select()
    .from(workQueueDismissals)
    .where(
      and(
        eq(workQueueDismissals.userId, userId),
        gt(workQueueDismissals.expiresAt, now)
      )
    )

  // Build a Set of dismissed application IDs → reason for O(1) lookup
  // key: `${applicationId}::${reason}` — an app can be dismissed under one reason
  // but still appear if it qualifies under a higher-priority reason that hasn't been dismissed
  const dismissedKeys = new Set(
    dismissals.map((d) => `${d.applicationId}::${d.reason}`)
  )

  // 3. Fetch open review assignments for this user (resolvedAt IS NULL)
  const userAssignments = await db
    .select()
    .from(reviewAssignments)
    .where(
      and(
        eq(reviewAssignments.assignedToId, userId),
        isNull(reviewAssignments.resolvedAt)
      )
    )

  // Build a map of applicationId → assignment for O(1) lookup
  const assignmentMap = new Map(
    userAssignments.map((a) => [a.applicationId, a])
  )

  // Build a Set of application IDs that have active assignments
  const assignedAppIds = new Set(userAssignments.map((a) => a.applicationId))

  // 4. Classify each application
  const items: WorkQueueItem[] = []

  // Track which app IDs have already been added (assigned apps appear only once)
  const addedAppIds = new Set<string>()

  // First pass: add all assigned applications with highest priority
  for (const app of activeApps) {
    if (!assignedAppIds.has(app.id)) continue

    const assignment = assignmentMap.get(app.id)!
    addedAppIds.add(app.id)

    items.push({
      application: app,
      reason: 'assigned',
      reasonLabel: `Assigned for review by ${assignment.assignedByEmail}`,
      effortLevel: 'research',
      effortLabel: 'Needs research',
    })
  }

  // Second pass: add remaining applications classified by staleness / missing fields / unverified risk
  for (const app of activeApps) {
    // Skip apps already added as assigned — they appear only once
    if (addedAppIds.has(app.id)) continue

    const days = getDaysSinceReview(app.lastReviewedAt)

    // Determine the highest-priority reason this app qualifies for
    let reason: QueueItemReason | null = null

    if (days >= thresholds.critical) {
      reason = 'critical'
    } else if (days >= thresholds.warning) {
      reason = 'warning'
    } else {
      const missing = getMissingRequiredFields(app)
      if (missing.length > 0) {
        reason = 'missing_fields'
      } else if (app.riskFieldsLastVerifiedAt === null) {
        reason = 'unverified_risk'
      }
    }

    if (reason === null) continue

    // 5. Filter out dismissed items
    const dismissKey = `${app.id}::${reason}`
    if (dismissedKeys.has(dismissKey)) continue

    // Build the queue item
    let reasonLabel: string
    let effortLevel: EffortLevel
    let daysStale: number | undefined
    let missingFields: string[] | undefined

    if (reason === 'critical' || reason === 'warning') {
      daysStale = days
      reasonLabel = buildStalenessLabel(days, reason)
      // For staleness, effort is always 'quick' — user just needs to confirm the record is current
      effortLevel = 'quick'
    } else if (reason === 'missing_fields') {
      const missingKeys = getMissingRequiredFields(app)
      missingFields = missingKeys.map(fieldLabel)
      reasonLabel = `Missing required fields: ${missingFields.join(', ')}`
      effortLevel = computeEffort(missingKeys)
    } else {
      // unverified_risk
      reasonLabel = 'Risk flags have never been explicitly reviewed'
      effortLevel = 'research'
    }

    items.push({
      application: app,
      reason,
      reasonLabel,
      effortLevel,
      effortLabel: effortLevel === 'quick' ? 'Quick update' : 'Needs research',
      daysStale,
      missingFields,
    })
  }

  // 6. Sort: by reason priority first, then by lastReviewedAt ascending (oldest first within tier)
  items.sort((a, b) => {
    const priorityDiff = REASON_ORDER[a.reason] - REASON_ORDER[b.reason]
    if (priorityDiff !== 0) return priorityDiff
    return a.application.lastReviewedAt.getTime() - b.application.lastReviewedAt.getTime()
  })

  return items
}
