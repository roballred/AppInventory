import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { logger } from '@/lib/logger'

// Singleton pool — prevents multiple pools being created during Next.js hot-reload in dev.
// Pool config: max 10 connections, 30s idle timeout, 5s connection timeout.
// These values are appropriate for a single-tenant deployment; adjust for multi-agency scale.
const globalForPool = global as unknown as { _pgPool?: Pool }

if (!globalForPool._pgPool) {
  globalForPool._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  globalForPool._pgPool.on('error', (err) => {
    logger.error('db.pool', 'Unexpected pool client error', { error: err.message })
  })
}

export const pool = globalForPool._pgPool
export const db = drizzle(pool, { schema })
