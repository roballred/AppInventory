# Data Retention Policy

## Overview
This document defines the data retention and deletion schedule for the State Application Inventory system.

## Retention Periods

| Table | Retention | Rationale |
|---|---|---|
| `applications` | Indefinite while active; soft-deleted via `lifecycleStatus = 'retired_from_inventory'` | Regulatory and audit continuity |
| `application_audit_log` | 7 years | State records law compliance |
| `certifications` | Indefinite | Annual certification record |
| `notifications` | 90 days | Operational; no long-term value |
| `work_queue_dismissals` | Auto-expires via `expiresAt` column | Ephemeral UI state |
| `review_assignments` | 3 years after `resolvedAt` | Assignment history for accountability |
| `users` | Active while employed; manual removal on offboarding | PII minimization |
| `business_rules` | Indefinite (versioned via `updatedAt`) | Configuration history |

## Hard Deletion

Hard deletion is not currently implemented. All records are retained with soft-delete patterns (lifecycleStatus for applications, resolvedAt for assignments).

A scheduled job for purging expired `notifications` and `work_queue_dismissals` records is recommended for future implementation.

## PII Considerations

The following fields contain PII and are subject to state privacy law:
- `users.email`, `users.displayName`
- `applications.technicalOwnerEmail`, `applications.technicalOwner`
- `review_assignments.assignedByEmail`, `review_assignments.assignedToEmail`
- `application_audit_log.userEmail`

On employee offboarding, the IT administrator should:
1. Remove the user record from the `users` table
2. Reassign any open review assignments
3. Revoke the user's identity provider access

## Backup and Recovery

See `infrastructure.md` for backup schedule and RTO/RPO targets.
