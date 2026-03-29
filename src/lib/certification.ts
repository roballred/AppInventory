/**
 * Certification helpers for CAP-05 — Annual Certification.
 */

import { and, eq, lt, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { businessRules, certifications, applications } from '@/lib/db/schema'
import type { Certification, Application } from '@/lib/db/schema'

// ─── Deadline helpers ─────────────────────────────────────────────────────────

/**
 * Returns the certification deadline date for a given year from business rules.
 * Reads certification_deadline_month and certification_deadline_day from the DB.
 * Default: September 30.
 */
export async function getCertificationDeadline(year: number): Promise<Date> {
  try {
    const [monthRow, dayRow] = await Promise.all([
      db
        .select()
        .from(businessRules)
        .where(eq(businessRules.key, 'certification_deadline_month'))
        .then((rows) => rows[0]),
      db
        .select()
        .from(businessRules)
        .where(eq(businessRules.key, 'certification_deadline_day'))
        .then((rows) => rows[0]),
    ])

    const month = monthRow ? parseInt(monthRow.value, 10) : 9 // September
    const day = dayRow ? parseInt(dayRow.value, 10) : 30

    const m = Number.isFinite(month) && month >= 1 && month <= 12 ? month : 9
    const d = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 30

    // Month is 0-indexed in JS Date
    return new Date(year, m - 1, d)
  } catch {
    // Default: September 30
    return new Date(year, 8, 30)
  }
}

/**
 * Returns the current certification year based on today's date and the deadline.
 * If today is on or before the deadline, return current year.
 * If today is after the deadline, return next year (new cycle has opened).
 */
export async function getCurrentCertificationYear(): Promise<number> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const deadline = await getCertificationDeadline(currentYear)

  if (now <= deadline) {
    return currentYear
  } else {
    return currentYear + 1
  }
}

// ─── Certification record helpers ─────────────────────────────────────────────

/**
 * Returns the current year's certification record for an agency, or null if not started.
 */
export async function getCertification(
  agencyId: string,
  year: number
): Promise<Certification | null> {
  const [cert] = await db
    .select()
    .from(certifications)
    .where(and(eq(certifications.agencyId, agencyId), eq(certifications.year, year)))

  return cert ?? null
}

// ─── Stale count helpers ──────────────────────────────────────────────────────

/**
 * Returns count of critical stale applications for an agency (blocks submission).
 */
export async function getCriticalStaleCount(
  agencyId: string,
  thresholds: { warning: number; critical: number }
): Promise<number> {
  const cutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)

  const [{ value }] = await db
    .select({ value: count() })
    .from(applications)
    .where(and(eq(applications.agencyId, agencyId), lt(applications.lastReviewedAt, cutoff)))

  return Number(value)
}

/**
 * Returns critical stale applications for the resolution step.
 */
export async function getCriticalStaleApplications(
  agencyId: string,
  thresholds: { warning: number; critical: number }
): Promise<Application[]> {
  const cutoff = new Date(Date.now() - thresholds.critical * 24 * 60 * 60 * 1000)

  return db
    .select()
    .from(applications)
    .where(and(eq(applications.agencyId, agencyId), lt(applications.lastReviewedAt, cutoff)))
}
