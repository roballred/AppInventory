/**
 * Notification generation engine for CAP-04.
 *
 * Generates in-app notifications for:
 *   - Records crossing the staleness warning threshold
 *   - Records crossing the staleness critical threshold
 *   - Certification deadline approaching (within reminder_days)
 *
 * Each notification has a dedupeKey so re-running generation on the same day
 * is idempotent — duplicate keys are silently ignored on insert.
 */

import { eq, and, lt, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, agencies, notifications, businessRules } from '@/lib/db/schema'
import { getStalenessThresholds } from '@/lib/business-rules'
import { getCertificationDeadline, getCurrentCertificationYear } from '@/lib/certification'
import { logger } from '@/lib/logger'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── Insert one notification, silently skip on dedupe conflict ────────────────

async function insertNotification(n: {
  agencyId: string
  userId?: string | null
  type: 'staleness_warning' | 'staleness_critical' | 'certification_deadline' | 'assignment'
  applicationId?: string | null
  title: string
  body: string
  dedupeKey: string
}): Promise<boolean> {
  try {
    await db
      .insert(notifications)
      .values({
        agencyId: n.agencyId,
        userId: n.userId ?? null,
        type: n.type,
        applicationId: n.applicationId ?? null,
        title: n.title,
        body: n.body,
        dedupeKey: n.dedupeKey,
      })
      .onConflictDoNothing({ target: notifications.dedupeKey })
    return true
  } catch (err) {
    logger.error('notifications', 'Failed to insert notification', {
      error: err instanceof Error ? err.message : String(err),
      dedupeKey: n.dedupeKey,
    })
    return false
  }
}

// ── Staleness notifications for one agency ───────────────────────────────────

export async function generateStalenessNotifications(
  agencyId: string,
  thresholds: { warning: number; critical: number }
): Promise<{ warning: number; critical: number }> {
  const today = todayKey()
  const now = Date.now()

  const warnCutoff = new Date(now - thresholds.warning * 24 * 60 * 60 * 1000)
  const critCutoff = new Date(now - thresholds.critical * 24 * 60 * 60 * 1000)

  // Active (non-retired) apps
  const activeApps = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.agencyId, agencyId),
        ne(applications.lifecycleStatus, 'retired_from_inventory')
      )
    )

  let warningCount = 0
  let criticalCount = 0

  for (const app of activeApps) {
    const daysSince = Math.floor((now - app.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))

    if (app.lastReviewedAt < critCutoff) {
      // Critical
      const inserted = await insertNotification({
        agencyId,
        type: 'staleness_critical',
        applicationId: app.id,
        title: `${app.name} is critically stale`,
        body: `Not reviewed in ${daysSince} days — this record blocks certification submission until updated.`,
        dedupeKey: `staleness_critical:${app.id}:${today}`,
      })
      if (inserted) criticalCount++
    } else if (app.lastReviewedAt < warnCutoff) {
      // Warning
      const inserted = await insertNotification({
        agencyId,
        type: 'staleness_warning',
        applicationId: app.id,
        title: `${app.name} needs review`,
        body: `Last reviewed ${daysSince} days ago — review soon to keep this record current.`,
        dedupeKey: `staleness_warning:${app.id}:${today}`,
      })
      if (inserted) warningCount++
    }
  }

  return { warning: warningCount, critical: criticalCount }
}

// ── Certification deadline notifications for one agency ──────────────────────

export async function generateCertificationDeadlineNotification(
  agencyId: string
): Promise<boolean> {
  const today = todayKey()

  // Read reminder_days from business_rules
  const [reminderRow] = await db
    .select()
    .from(businessRules)
    .where(eq(businessRules.key, 'certification_reminder_days'))

  const reminderDays = reminderRow ? parseInt(reminderRow.value, 10) : 30

  const year = await getCurrentCertificationYear()
  const deadline = await getCertificationDeadline(year)
  const daysLeft = daysUntil(deadline)

  if (daysLeft < 0 || daysLeft > reminderDays) {
    return false // Not in reminder window
  }

  const deadlineStr = deadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const inserted = await insertNotification({
    agencyId,
    type: 'certification_deadline',
    applicationId: null,
    title: `Certification due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    body: `Your ${year} annual inventory certification is due on ${deadlineStr}. Log in to begin or continue the certification process.`,
    dedupeKey: `certification_deadline:${agencyId}:${today}`,
  })

  return inserted
}

// ── Generate for all agencies ─────────────────────────────────────────────────

export interface GenerationResult {
  agencyId: string
  agencyName: string
  staleness: { warning: number; critical: number }
  certDeadline: boolean
}

export async function generateAllNotifications(): Promise<GenerationResult[]> {
  const thresholds = await getStalenessThresholds()
  const allAgencies = await db.select().from(agencies)

  const results: GenerationResult[] = []

  for (const agency of allAgencies) {
    try {
      const staleness = await generateStalenessNotifications(agency.id, thresholds)
      const certDeadline = await generateCertificationDeadlineNotification(agency.id)
      results.push({ agencyId: agency.id, agencyName: agency.name, staleness, certDeadline })
    } catch (err) {
      logger.error('notifications', `Failed to generate notifications for agency ${agency.id}`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  logger.info('notifications', 'Generation complete', {
    agencies: results.length,
    totalWarning: results.reduce((s, r) => s + r.staleness.warning, 0),
    totalCritical: results.reduce((s, r) => s + r.staleness.critical, 0),
  })

  return results
}

// ── Assignment notification (called from review-assignments route) ────────────

export async function createAssignmentNotification(opts: {
  agencyId: string
  applicationId: string
  applicationName: string
  assignedToId: string
  assignedByName: string
}): Promise<void> {
  const today = todayKey()
  await insertNotification({
    agencyId: opts.agencyId,
    userId: opts.assignedToId,
    type: 'assignment',
    applicationId: opts.applicationId,
    title: `New record assigned for review`,
    body: `${opts.assignedByName} assigned ${opts.applicationName} to you for review.`,
    dedupeKey: `assignment:${opts.applicationId}:${opts.assignedToId}:${today}`,
  })
}
