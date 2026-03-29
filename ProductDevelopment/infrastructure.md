# State Application Inventory — Infrastructure & Operations

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-28

This document covers the hosting platform, backup strategy, disaster recovery procedure, and secret management for the State Application Inventory system. It is written for the platform administrator and the state IT operations team.

---

## Hosting Platform

The system is designed to run on any platform that supports:
- Node.js 18+ runtime (Next.js 14 App Router)
- PostgreSQL 16 database
- Environment variable injection

**Recommended platforms:** Vercel (Next.js native), Render, Railway, or any cloud VM with Docker support.

**Docker deployment:** The repository includes a `docker-compose.yml` for local development. Production deployments should use a managed PostgreSQL service rather than a containerized database.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) | Yes |
| `NEXTAUTH_SECRET` | Random secret for JWT signing (min 32 chars) | Yes |
| `NEXTAUTH_URL` | Full URL of the deployed application (e.g., `https://inventory.agency.gov`) | Yes |
| `IDENTITY_PROVIDER_CLIENT_ID` | OAuth client ID from the state identity provider | Yes (prod) |
| `IDENTITY_PROVIDER_CLIENT_SECRET` | OAuth client secret | Yes (prod) |
| `IDENTITY_PROVIDER_ISSUER` | OIDC issuer URL | Yes (prod) |
| `AUTH_BYPASS` | Set `true` to enable dev bypass accounts (must NOT be set in production) | Dev only |

**Secret rotation procedure:**
1. Generate a new secret value
2. Update the secret in the deployment platform's secret manager
3. Redeploy the application (old sessions will be invalidated for `NEXTAUTH_SECRET` rotations)
4. Confirm login works before removing the old secret

---

## Database

### Connection
The application connects to PostgreSQL via a connection pool (max 10 connections). The `DATABASE_URL` must point to a PostgreSQL 16+ instance.

### Schema management
Schema changes are applied using Drizzle Kit migration files in the `drizzle/` directory. Migrations run automatically on deployment via `drizzle-kit push` (dev) or `drizzle-kit migrate` (prod). **No manual database changes should be made outside this process.**

### Backups
| Item | Recommendation |
|------|---------------|
| Backup frequency | Daily automated snapshots minimum; hourly for production |
| Backup retention | 30 days of daily snapshots, 7 days of point-in-time recovery |
| Backup storage | Geographically separate from primary (different cloud region or provider) |
| Backup testing | Restore test quarterly to verify backup integrity |

**Note:** If using a managed PostgreSQL service (e.g., AWS RDS, Render PostgreSQL, Supabase), enable automated backups in the service console. Document the backup schedule and retention settings here once chosen.

---

## Disaster Recovery

### Recovery objectives
| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 24 hours (daily backup) |

### Recovery procedure
1. **Provision a new database instance** from the most recent backup snapshot
2. **Set `DATABASE_URL`** in the deployment environment to the new instance
3. **Run `npm run db:push`** if schema needs to be applied to a blank instance
4. **Redeploy the application** pointing to the restored database
5. **Verify** by logging in with a platform admin account and spot-checking application records
6. **Notify agencies** if data loss has occurred (records created after the last backup are lost)

### Contact list (update before go-live)
| Role | Name | Contact |
|------|------|---------|
| Platform Administrator | TBD | TBD |
| Database Administrator | TBD | TBD |
| State IT Operations | TBD | TBD |

---

## Security

### JWT session management
- JWT sessions are valid for 2 hours (reduced from 8 hours in v1 to limit the role-revocation window — see ISSUE-01)
- If a user's role is changed, their existing session remains valid until the JWT expires
- Accepted residual risk: up to 2 hours of access after role change
- Mitigation for v2: implement server-side session invalidation (requires users table from ISSUE-22)

### Auth bypass
The `AUTH_BYPASS=true` environment variable enables hardcoded dev accounts. This **must not** be set in production. The application does not enforce this at runtime — it is the operator's responsibility to exclude this variable from production deployments.

---

## Data Retention

See `data-model.md` for the Schema Evolution Policy. Retention policy is documented in ISSUE-16 and has not yet been formally defined. Until a policy is established:
- Audit log records are retained indefinitely
- Notification records are retained indefinitely
- Certification records are retained indefinitely

**Action required:** Define retention periods aligned with the adopting state's records retention schedule before go-live.

---

## Identity Provider Integration

The system uses NextAuth.js with an OIDC provider. In development, `AUTH_BYPASS=true` bypasses the provider entirely.

The `identityGroup` field on the Agency model is reserved for future use — it will link agencies to their SSO group claims for automatic agency assignment at sign-in. This is not yet implemented (see ISSUE-19). Manual role assignment via platform admin UI is used in v1.

**Identity provider contact:** TBD — identify the state IT staff responsible for OAuth application registration before go-live.
