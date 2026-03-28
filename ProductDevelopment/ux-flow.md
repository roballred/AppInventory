# State Application Inventory — UX Flow

**Product:** State Application Inventory
**Version:** v2
**Last Updated:** 2026-03-28
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

### Work Queue — Jordan's First Screen (CAP-09)
The first screen Jordan sees after login. Instead of a generic dashboard, Jordan sees a focused, prioritized list of records that need attention — nothing more.

Each item in the queue shows the application name, what needs updating, and an estimated effort level (quick update vs. needs research). Items are sorted by urgency — critically stale records first, then warning-level records, then records with missing required fields.

If Jordan has nothing to action, the queue shows a clear "all up to date" state — no hunting, no ambiguity.

**Available actions:** Update a record directly from the queue, dismiss if already handled, view full application list

> This screen is the product's most critical design decision. If Jordan doesn't find it useful in the first 30 seconds, the product fails.

---

### Dashboard
The first screen after login for Agency Admins and Viewers. Shows a summary of the agency's inventory at a glance.

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

### Agency Risk Dashboard — Maria's View (CAP-10)
A risk-focused view of the agency's inventory surfaced automatically for Agency Admins. Maria sees what needs attention without asking her team or interpreting raw data.

Risk is surfaced in four categories:

| Category | What it shows |
|----------|--------------|
| Aging Technology | Applications flagged as aging or running unsupported OS versions |
| Unsupported Versions | Applications where the vendor no longer provides support |
| AI-Enabled Applications | All applications with AI or generative AI flags — for awareness and policy compliance |
| Approaching Staleness | Records that will trigger a critical stale alert within 30 days |

Each item links directly to the application record. Maria can see the risk, understand the context, and act — or assign it to Jordan — without leaving the screen.

**Available actions:** View application detail, assign for review, export risk summary

---

### Search Results (CAP-01)
When a user searches for an application by name, vendor, or technology type, results appear in a clean list with key details visible at a glance — name, lifecycle status, vendor, and last reviewed date. Sam can find what they need without scrolling the full inventory.

**Available actions:** View application detail, refine search, filter results

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

### Data Quality Monitoring (CAP-08)
A live operational view of data quality across all agencies. Derek can see at a glance which agencies need follow-up before bad data becomes a reporting problem.

| View | What it shows |
|------|--------------|
| Stale Records by Agency | Which agencies have the most overdue records |
| Missing Required Fields | Agencies with incomplete application records |
| Inconsistent Values | Patterns of free-text entries or values that don't match controlled vocabulary |
| Retired but Active | Applications still listed as active that appear to be retired |

Derek can drill into any agency to see the specific records causing issues, then follow up directly.

**Available actions:** Drill into agency, export data quality report, flag agency for follow-up

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
