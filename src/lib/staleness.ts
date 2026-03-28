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
 * - 'critical': >= 180 days
 * - 'warning':  >= 90 days
 * - 'current':  < 90 days
 */
export function getStaleness(lastReviewedAt: Date): StalenessLevel {
  const days = getDaysSinceReview(lastReviewedAt)
  if (days >= STALENESS_THRESHOLDS.critical) return 'critical'
  if (days >= STALENESS_THRESHOLDS.warning) return 'warning'
  return 'current'
}
