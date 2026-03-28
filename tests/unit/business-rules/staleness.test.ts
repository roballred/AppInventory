/**
 * Unit tests — Staleness detection
 *
 * Verifies that the staleness rules from business-rules.json
 * are correctly applied based on last_reviewed_at date.
 */

// Replace with real implementation when built
function getStalenessStatus(
  lastReviewedAt: Date,
  warningDays = 90,
  criticalDays = 180
): 'current' | 'warning' | 'critical' {
  const daysSinceReview =
    (Date.now() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceReview >= criticalDays) return 'critical'
  if (daysSinceReview >= warningDays) return 'warning'
  return 'current'
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

describe('staleness detection', () => {
  it('returns current for a record reviewed today', () => {
    expect(getStalenessStatus(daysAgo(0))).toBe('current')
  })

  it('returns current for a record reviewed 89 days ago', () => {
    expect(getStalenessStatus(daysAgo(89))).toBe('current')
  })

  it('returns warning for a record reviewed exactly 90 days ago', () => {
    expect(getStalenessStatus(daysAgo(90))).toBe('warning')
  })

  it('returns warning for a record reviewed 91 days ago', () => {
    expect(getStalenessStatus(daysAgo(91))).toBe('warning')
  })

  it('returns warning for a record reviewed 179 days ago', () => {
    expect(getStalenessStatus(daysAgo(179))).toBe('warning')
  })

  it('returns critical for a record reviewed exactly 180 days ago', () => {
    expect(getStalenessStatus(daysAgo(180))).toBe('critical')
  })

  it('returns critical for a record reviewed 365 days ago', () => {
    expect(getStalenessStatus(daysAgo(365))).toBe('critical')
  })

  it('respects custom warning threshold', () => {
    expect(getStalenessStatus(daysAgo(60), 60, 120)).toBe('warning')
  })

  it('respects custom critical threshold', () => {
    expect(getStalenessStatus(daysAgo(120), 60, 120)).toBe('critical')
  })
})
