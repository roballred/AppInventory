# State Application Inventory — Capabilities

**Version:** v2
**Last Updated:** 2026-03-28

This document describes what the State Application Inventory product does — organized by the distinct capabilities it provides to agencies and the state IT authority.

Capabilities are derived from persona pain points and goals. Each capability traces back to at least one person this product must serve.

---

## Capabilities Overview

| ID | Capability | Serves |
|----|-----------|--------|
| CAP-01 | Agency Inventory Management | Jordan, Sam |
| CAP-02 | Identity & Access Control | All personas |
| CAP-03 | Data Quality Enforcement | Derek, Jordan |
| CAP-04 | Configurable Alerting & Notifications | Jordan, Maria |
| CAP-05 | Annual Certification | Jordan, Maria |
| CAP-06 | Platform Admin & Configuration | Derek |
| CAP-07 | Portfolio Intelligence | Thomas |
| CAP-08 | Data Quality Monitoring | Derek |
| CAP-09 | Guided Update Experience | Jordan |
| CAP-10 | Agency Risk Dashboard | Maria |

---

## Capability Details

### CAP-01 — Agency Inventory Management
Agencies can add new applications, update existing records, and mark applications as retired at any time throughout the year. All fields use controlled values to keep data consistent across agencies.

**Search and discovery is explicitly included.** Users can find applications by name, vendor, technology type, or lifecycle status without scrolling a full list. This is essential for Sam — a newly onboarded employee who needs to find system information quickly without asking someone.

*Serves: Jordan (maintaining records), Sam (finding information)*

---

### CAP-02 — Identity & Access Control
Users log in through their existing state identity provider — no separate username or password required. Once logged in, each person sees only their own agency's data. Roles (platform admin, agency admin, submitter, viewer) determine what actions each person can take.

*Serves: All personas*

---

### CAP-03 — Data Quality Enforcement
The system validates records at the point of entry. Required fields must be filled in. Controlled fields only accept approved values. This prevents inconsistent or incomplete data from being saved — addressing Derek's core pain point of spending weeks cleaning bad data before any analysis is possible.

*Serves: Derek (clean data without cleanup), Jordan (guided entry reduces errors)*

---

### CAP-04 — Configurable Alerting & Notifications
Platform administrators define rules for when alerts are sent and to whom. Notifications are delivered by email and within the app. The notification engine is designed to be extensible so agencies can define their own alerts in a future release.

Notifications should be helpful and actionable — not just reminders. Each alert should tell the recipient what to do, not just that something is wrong.

*Serves: Jordan (knowing what needs attention), Maria (early warning on risks)*

---

### CAP-05 — Annual Certification
Agencies review their full inventory, confirm accuracy, and submit a formal attestation each year. Records that are critically out of date block the submission until resolved. This ensures the certification reflects a genuinely current inventory — not a one-time data entry event.

*Serves: Jordan (clear completion point), Maria (confidence before sign-off)*

---

### CAP-06 — Platform Admin & Configuration
The state IT authority's platform administrators can view all agency data, configure notification thresholds and business rules, monitor agency compliance status, and approve certification submissions — all without code changes.

*Serves: Derek (system management and oversight)*

---

### CAP-07 — Portfolio Intelligence
The state IT authority can analyze application data across all agencies to identify technology duplication, find consolidation opportunities, and surface candidates for shared services. Supports on-demand queries so Thomas can answer questions from the Governor's office or Legislature without waiting for a scheduled report.

*Serves: Thomas (statewide portfolio decisions and legislative reporting)*

---

### CAP-08 — Data Quality Monitoring
The state IT authority has a live view of data quality across all agencies — which agencies have stale records, missing required fields, inconsistent values, or retired systems still listed as active. Derek can identify and follow up with specific agencies before bad data becomes a reporting problem.

This is distinct from CAP-07 (strategic portfolio analysis). CAP-08 is operational day-to-day oversight. CAP-07 is strategic decision support.

*Serves: Derek (operational data quality visibility — not just at certification time)*

---

### CAP-09 — Guided Update Experience
Jordan gets a personal work queue — a focused view showing exactly which records need attention and why, without having to scan a full inventory list. Each item in the queue tells Jordan what to update and how long it will take.

This capability exists because Jordan's adoption determines whether the entire product delivers value. If Jordan opens the app and sees 200 records with no guidance on where to start, Jordan closes the tab. The work queue removes that friction.

*Serves: Jordan (the most critical persona — continuous maintenance depends entirely on this being easy)*

---

### CAP-10 — Agency Risk Dashboard
Maria gets a risk-focused view of her own agency's inventory — aging technology, unsupported versions, AI-enabled applications, and records approaching the staleness threshold. Surfaced automatically so Maria doesn't have to ask her team or interpret raw data herself.

This is distinct from CAP-06 (platform admin tools) which serves Derek. CAP-10 is Maria's view of her own agency's health — not the full cross-agency platform admin view.

*Serves: Maria (confidence and risk visibility without data diving)*

---

## Capability-to-Persona Traceability

| Persona | Pain Point | Capability That Addresses It |
|---------|-----------|------------------------------|
| Jordan | Doesn't know what needs updating without hunting | CAP-09 — Guided Update Experience |
| Jordan | New system feels like more work | CAP-09 — Work queue reduces friction |
| Jordan | Reminder emails feel like pressure | CAP-04 — Actionable notifications, not just reminders |
| Maria | Doesn't trust the data her team submits | CAP-10 — Agency Risk Dashboard |
| Maria | No visibility into risks without asking | CAP-10 — Risk surfaced automatically |
| Derek | Weeks of manual data cleanup after deadline | CAP-03 — Quality enforced at entry |
| Derek | No cross-agency data quality visibility | CAP-08 — Data Quality Monitoring |
| Sam | No way to find system information quickly | CAP-01 — Search and discovery |
| Thomas | Year-old data for Governor's office questions | CAP-07 — On-demand portfolio intelligence |
