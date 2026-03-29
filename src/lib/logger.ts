/**
 * Structured application logger.
 *
 * In development this writes colorized output to the console.
 * In production this writes JSON lines suitable for log aggregation.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.error('api.applications', 'DB query failed', { error: err.message, userId })
 *   logger.warn('business-rules', 'Using fallback thresholds', { reason: err.message })
 *   logger.info('certification', 'Submitted', { agencyId, year })
 */

type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, component: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    ...(meta ?? {}),
  }

  if (process.env.NODE_ENV === 'production') {
    // JSON lines for log aggregators (Datadog, CloudWatch, etc.)
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    const COLOR = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' }
    const c = COLOR[level]
    const metaStr = meta ? ' ' + JSON.stringify(meta) : ''
    console[level](`${c}[${level.toUpperCase()}]${COLOR.reset} ${component}: ${message}${metaStr}`)
  }
}

export const logger = {
  info: (component: string, message: string, meta?: Record<string, unknown>) =>
    log('info', component, message, meta),
  warn: (component: string, message: string, meta?: Record<string, unknown>) =>
    log('warn', component, message, meta),
  error: (component: string, message: string, meta?: Record<string, unknown>) =>
    log('error', component, message, meta),
}
