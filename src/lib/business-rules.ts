/**
 * Fetches configurable thresholds from the database with hardcoded fallbacks.
 * Falls back to defaults if the DB is unavailable or the key is missing.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { businessRules } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

export const DEFAULT_THRESHOLDS = { warning: 90, critical: 180 }

export async function getStalenessThresholds(): Promise<{ warning: number; critical: number }> {
  try {
    const [warningRow, criticalRow] = await Promise.all([
      db
        .select()
        .from(businessRules)
        .where(eq(businessRules.key, 'staleness_warning_days'))
        .then((rows) => rows[0]),
      db
        .select()
        .from(businessRules)
        .where(eq(businessRules.key, 'staleness_critical_days'))
        .then((rows) => rows[0]),
    ])

    const warning =
      warningRow ? parseInt(warningRow.value, 10) : DEFAULT_THRESHOLDS.warning
    const critical =
      criticalRow ? parseInt(criticalRow.value, 10) : DEFAULT_THRESHOLDS.critical

    return {
      warning: Number.isFinite(warning) ? warning : DEFAULT_THRESHOLDS.warning,
      critical: Number.isFinite(critical) ? critical : DEFAULT_THRESHOLDS.critical,
    }
  } catch (err) {
    logger.warn('business-rules', 'Failed to load staleness thresholds from DB — using defaults', {
      error: err instanceof Error ? err.message : String(err),
    })
    return DEFAULT_THRESHOLDS
  }
}
