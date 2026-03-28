# State Application Inventory — UX Flow

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27
**Design System:** U.S. Web Design System (USWDS)
**Accessibility Standard:** WCAG 2.2 AA

This document describes the screens and user flows in the application, organized by role. It is intended for product managers, policy leads, and design reviewers — not as a technical specification.

---

## Design Principles

- All screens meet WCAG 2.2 AA — keyboard navigable, screen reader compatible, sufficient color contrast
- Standard USWDS components are used throughout; no custom components unless no standard equivalent exists
- Agency users only ever see their own agency's data
- Platform admins see all agency data, with the agency name always clearly visible for context
- Actions that look permanent (retiring or reverting a record) always require a confirmation step before executing
- All forms show plain-language error messages inline — users are never left guessing what went wrong
- Dropdown fields only offer valid values — no free-text entry where a controlled value is required

---

## Signing In

All users sign in through their existing state identity provider (single sign-on). No separate username or password is needed for this application.

| Step | What the User Sees |
|------|--------------------|
| Landing page | State-branded page with a single "Sign In" button |
| Identity provider login | Redirect to the state's own login page — handled entirely by the state identity provider |
| Role check | After login, the system checks the user's role and agency assignment and redirects to the appropriate dashboard |
| Access pending | If no role is assigned yet, the user sees a message with contact information for their agency admin |

---

## Agency User Screens

Applies to: Agency Admin, Submitter, Viewer

### Dashboard
The first screen after login. Shows a summary of the agency's inventory at a glance.

- Total number of applications
- Count of stale records
- Breakdown by lifecycle status
- Current year certification status
- Alerts for stale or overdue records

**Available actions:** View applications, add an application, view certification status, view notifications

---

### Application List
A full, paginated table of the agency's applications. Stale records are highlighted. Retired applications are shown with a visual indicator but are not hidden.

**Filters:** Lifecycle status, staleness, AI-enabled, vendor
**Available actions:** View a record, add an application, export (agency admin only)

---

### Application Detail
Full view of a single application record, showing all fields and when the record was last reviewed. A separate tab shows the complete audit history — every change, who made it, and when.

**Available actions:** Edit, retire, revert (if already retired), view audit history

---

### Add / Edit Application
A form for creating a new record or updating an existing one. Required fields are clearly marked. Dropdown fields show only valid options. Errors appear inline with plain-language messages.

**Fields include:** Name, description, version, lifecycle status, manufacturer/vendor, cloud service provider, operating system and version, contract number, license number, in-service date, retirement date, and flags for unsupported version, updatable, aging technology, AI-enabled, and generative AI.

**Available actions:** Save, cancel

---

### Retire Confirmation
A confirmation dialog that appears before retiring an application. Clearly states that retiring is reversible. Requires the user to confirm before proceeding.

---

### Revert Confirmation
A confirmation dialog that appears before reverting a retired application back to active. Shows the previous lifecycle status so the user knows what they are restoring.

---

### Annual Certification
A guided, step-by-step process for the agency admin to certify the agency's inventory.

| Step | Description |
|------|-------------|
| 1. Review inventory summary | See total records, stale counts, and any blockers |
| 2. Resolve stale records | Address any records that are critically out of date (required before submission) |
| 3. Attest and submit | Check the attestation statement and submit |

**Available actions:** Resolve stale records, attest and submit, save progress

---

### Notifications
An in-app notification center listing all alerts for the user, with read and unread indicators. Each notification links directly to the relevant application record.

**Available actions:** Mark as read, go to the application

---

## Platform Admin Screens

Applies to: Platform Admin only

### Admin Dashboard
A statewide overview showing summary data across all agencies.

- Total agencies and total applications
- Agencies with stale records
- Certification completion status by agency for the current year

**Available actions:** Drill into an agency, view portfolio intelligence, manage business rules, manage users

---

### Agency Drill Down
The same application list view that agency users see, but accessible for any agency. The agency name is always displayed in the header so the admin always knows whose data they are viewing.

**Available actions:** View a record, edit a record, export agency data

---

### Portfolio Intelligence
A cross-agency analysis view for identifying patterns, duplication, and consolidation opportunities across the entire state portfolio.

**Built-in views:**
- Applications grouped by vendor (all agencies)
- Applications by lifecycle status
- AI-enabled applications
- Aging technology by agency
- Candidates for central/shared services (same vendor or technology type used by 3 or more agencies)

**Available actions:** Filter, sort, export

---

### Business Rules Configuration
An admin interface for adjusting how the system behaves — no code changes required.

**Configurable settings:**
- Staleness warning threshold (in days)
- Staleness critical threshold (in days)
- Certification reminder lead time (in days)
- Staleness threshold that blocks certification (in days)
- Notification channels (email, in-app)
- Enable or disable individual notification triggers

**Available actions:** Save rules, reset to defaults, preview affected records

---

### User Management
A table of all users across all agencies. Platform admins can assign or remove roles. Agency admins can do the same within their own agency only.

**Available actions:** Assign role, remove role, filter by agency

---

### Certification Approval
A list of certification submissions from agencies. Shows submission date, submitter name, and inventory summary for each agency.

**Available actions:** Approve certification, request revision
