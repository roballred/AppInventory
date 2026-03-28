# State Application Inventory — Business Rules

**Product:** State Application Inventory
**Version:** v2
**Last Updated:** 2026-03-28

This document describes the rules that govern how the system behaves — when notifications are sent, what data is required, and how the annual certification process works. Platform administrators can configure most of these rules through the app without any code changes.

---

## Staleness Thresholds

A record becomes "stale" when it hasn't been reviewed or updated within a set number of days. Stale records trigger notifications and can block annual certification.

| Level | Threshold | What Happens |
|-------|-----------|--------------|
| Stale Warning | 90 days | Notification sent to the technical owner and business owner |
| Stale Critical | 180 days | Notification sent to technical owner, business owner, and agency admin. Submission blocked until resolved. |

---

## Notifications

The system sends automated notifications by email and within the app. All triggers listed below are active by default and can be enabled or disabled by platform administrators.

| Trigger | When It Fires | Who Receives It | Message |
|---------|--------------|-----------------|---------|
| Stale Warning | Record not updated in 90 days | Technical owner, business owner | Review and confirm accuracy of the record |
| Stale Critical | Record not updated in 180 days | Technical owner, business owner, agency admin | Immediate review required |
| Certification Reminder | 30 days before certification deadline | Agency admin | Certification due in 30 days — review inventory |
| Certification Due | 7 days before certification deadline | Agency admin, technical owner | Certification due in 7 days — complete and submit |
| Record Retired | Application marked as retired | Agency admin | Confirm the retirement is accurate |

**Notification channels:** Email and in-app

**Note on future releases:** The notification engine is designed as a generic rules processor. Agency-defined alerts (where agencies set their own thresholds) are planned for a future release.

---

## Required Data Fields

Every application record must include the following fields. Records missing any of these cannot be saved.

- Agency name
- Agency number
- Application name
- Lifecycle status
- Version information
- Manufacturer
- Technical owner
- In-service / production date

---

## Controlled Field Values

The following fields only accept values from a fixed list. This keeps data consistent and comparable across all agencies.

### Lifecycle Status
- In development
- In production
- Retirement in progress
- Retired from inventory

### Business Criticality
- Business Essential
- Historical
- Mission Critical
- User Productivity

### Core Business Function
Civil Engagement & Law, Commerce, Communications, Customer Service, Education, Finance, Fiscal & Revenue, Health & Human Services, Health / Safety / Security / Environmental, Land Management & Conservation, Legal, Manufacturing & Delivery, Marketing & Sales, Military, Product Management, Property & Facility, Public Safety, Risk / Audit & Compliance, Transportation & Infrastructure, Vendor & Procurement, Workforce

---

## Work Queue Prioritization (CAP-09)

Jordan's work queue sorts records by urgency and labels each with an effort estimate. These rules determine both the sort order and the effort label.

### Sort Order

| Priority | Condition |
|----------|-----------|
| 1 — Critical | Record is past the Stale Critical threshold (default: 180 days) |
| 2 — Warning | Record is past the Stale Warning threshold (default: 90 days) |
| 3 — Missing fields | Record has one or more required fields that are blank |
| 4 — Unverified risk | Record has risk flags that have never been explicitly verified since creation |

Within each priority tier, records are sorted by the date they entered that tier — oldest first.

### Success Metrics

These three metrics determine whether the work queue is changing Jordan's behavior — not just whether Jordan can see it. All three are derived from existing audit log and staleness data; no additional instrumentation is required.

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| **Update distribution** | Percentage of record updates that happen outside the 30 days before the certification deadline | > 60% of updates occur outside the pre-certification window |
| **Queue action rate** | Percentage of queue items Jordan resolves or dismisses (vs. leaves untouched) within a session | > 70% of items actioned per session |
| **Warning-to-critical escalation rate** | Percentage of stale warning records that escalate to stale critical without being updated | < 15% of warning records escalate to critical |

Baseline values should be recorded at the end of the first full certification cycle. Targets above are starting hypotheses — revise them once real usage data is available.

---

### Effort Estimate

Effort is based on the type of fields that need attention, not just the count. Fields are classified into two categories:

**Lookup fields** — Jordan can confirm or update these without external research. The answer is knowable from the application itself or internal records.

| Field |
|-------|
| Application name |
| Description |
| Lifecycle status |
| Version |
| Cloud service provider |
| In-service / production date |
| Retirement date |
| AI Enabled |
| Generative AI |
| Updatable |

**Research fields** — Jordan needs to check an external source: vendor documentation, a support matrix, procurement records, or a policy definition.

| Field | Why it requires research |
|-------|--------------------------|
| Manufacturer / Vendor | May require procurement records to confirm current vendor |
| Contract number / License number | Requires procurement lookup |
| Operating system and OS version | May require checking actual server or configuration |
| Unsupported Version flag | Requires checking vendor's current support lifecycle |
| Aging Technology flag | Requires policy interpretation and vendor roadmap check |
| Risk flags marked Unverified | Have never been reviewed — accuracy unknown |

**Effort label logic:**

| Condition | Label |
|-----------|-------|
| All fields needing attention are lookup fields | Quick update |
| Any field needing attention is a research field | Needs research |

The effort label is shown in the work queue item next to the application name. It is not a hard gate — Jordan can always start a record regardless of effort level.

---

## Annual Certification

| Rule | Value |
|------|-------|
| Certification deadline | September 30 (Washington State example — adopting states should set their own deadline) |
| Attestation required | Yes |
| Minimum records to submit | 1 |
| Stale records block submission | Yes — records stale beyond 180 days must be resolved before submission |

The certification deadline and staleness block threshold are configurable by platform administrators.
