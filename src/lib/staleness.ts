export const STALENESS_THRESHOLDS = {
  warning: 90,   // days
  critical: 180, // days
} as const

export type StalenessLevel = 'current' | 'warning' | 'critical'

/**
 * Returns the number of whole days since the given date.
 */
export function getDaysSinceReview(lastReviewedAt: Date): number {
  const now = Date.now()
  const then = lastReviewedAt.getTime()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

/**
 * Returns the staleness level for a record based on its last reviewed date.
 * - 'critical': >= critical threshold days
 * - 'warning':  >= warning threshold days
 * - 'current':  < warning threshold days
 *
 * Accepts an optional thresholds parameter so callers can pass DB-fetched values.
 * Defaults to STALENESS_THRESHOLDS for backward compatibility and tests.
 */
export function getStaleness(
  lastReviewedAt: Date,
  thresholds: { warning: number; critical: number } = STALENESS_THRESHOLDS
): StalenessLevel {
  const days = getDaysSinceReview(lastReviewedAt)
  if (days >= thresholds.critical) return 'critical'
  if (days >= thresholds.warning) return 'warning'
  return 'current'
}
