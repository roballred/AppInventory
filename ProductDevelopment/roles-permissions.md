# State Application Inventory — Roles & Permissions

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27

This document describes who can do what in the State Application Inventory. Roles are assigned through the state identity provider and enforced by the application.

---

## Key Principles

- **No data is ever permanently deleted.** Retiring an application changes its status to "Retired from inventory" — the record stays in the system and can be reversed.
- **All changes are recorded.** Every edit, retirement, and reversion is captured in the audit log with a timestamp and the name of the person who made the change.
- **Agency data is scoped.** Agency users only ever see their own agency's records. Only platform admins can see data across all agencies.

---

## Role Descriptions

| Role | Who It's For | Data Scope |
|------|-------------|------------|
| Platform Admin | State IT authority staff who manage the system | All agencies |
| Agency Admin | Agency IT lead responsible for inventory and certification | Own agency only |
| Submitter | Agency staff who maintain application records day to day | Own agency only |
| Viewer | Read-only access — suitable for auditors or leadership | Own agency only |

---

## Permissions Matrix

| Action | Platform Admin | Agency Admin | Submitter | Viewer |
|--------|:--------------:|:------------:|:---------:|:------:|
| View own agency's applications | Yes | Yes | Yes | Yes |
| Add an application | Yes | Yes | Yes | No |
| Edit an application | Yes | Yes | Yes | No |
| Retire an application | Yes | Yes | Yes | No |
| Revert a retired application | Yes | Yes | Yes | No |
| View audit history | Yes | Yes | Yes | Yes |
| Submit annual certification | Yes | Yes | No | No |
| Approve certification | Yes | No | No | No |
| Manage agency users and roles | Yes | Yes (own agency only) | No | No |
| View all agencies' data | Yes | No | No | No |
| Configure business rules | Yes | No | No | No |
| Export data and reports | Yes | Yes | No | No |
| Cross-agency insights and analysis | Yes | No | No | No |

---

## Notes on Specific Actions

**Retire / Revert:** These actions change the lifecycle status of a record — they do not delete anything. Submitters, agency admins, and platform admins can all retire or revert applications. Every retirement and reversion is logged.

**Certification approval:** Only platform admins can approve a certification after an agency submits it. Agency admins can submit but not self-approve.

**User management:** Agency admins can add, edit, or remove users within their own agency. Platform admins can manage users across all agencies.

**Business rules:** Only platform admins can change notification thresholds, staleness rules, or certification deadlines.
