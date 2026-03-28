# State Application Inventory — Capabilities

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27

This document describes what the State Application Inventory product does — organized by the distinct capabilities it provides to agencies and the state IT authority.

---

## Capabilities Overview

| ID | Capability | Summary |
|----|-----------|---------|
| CAP-01 | Agency Inventory Management | Agencies maintain their own application records |
| CAP-02 | Identity & Access Control | Secure login with role-based, agency-scoped access |
| CAP-03 | Data Quality Enforcement | Validation rules prevent bad data from entering the system |
| CAP-04 | Configurable Alerting & Notifications | Automated alerts based on configurable rules and thresholds |
| CAP-05 | Annual Certification | Structured process for agencies to certify their inventory each year |
| CAP-06 | Platform Admin & Configuration | Tools for the state IT authority to manage the system |
| CAP-07 | Portfolio Intelligence | Statewide analysis across all agency inventories |

---

## Capability Details

### CAP-01 — Agency Inventory Management
Agencies can add new applications, update existing records, and mark applications as retired at any time throughout the year. All fields use controlled values to keep data consistent across agencies.

### CAP-02 — Identity & Access Control
Users log in through their existing state identity provider — no separate username or password required. Once logged in, each person sees only their own agency's data. Roles (admin, submitter, viewer) determine what actions each person can take.

### CAP-03 — Data Quality Enforcement
The system validates records at the point of entry. Required fields must be filled in. Controlled fields (such as lifecycle status and business function) only accept approved values. This prevents inconsistent or incomplete data from being saved.

### CAP-04 — Configurable Alerting & Notifications
Platform administrators define rules for when alerts are sent — for example, when a record hasn't been updated in 90 days, or when annual certification is approaching. Notifications are delivered by email and within the app. The notification engine is designed to be extensible so agencies can define their own alerts in a future release.

### CAP-05 — Annual Certification
Agencies review their full inventory, confirm accuracy, and submit a formal attestation each year. Records that are critically out of date (stale) block the submission until they are resolved. This ensures the certification reflects a genuinely current inventory.

### CAP-06 — Platform Admin & Configuration
The state IT authority's platform administrators can view all agency data, configure notification thresholds and business rules, monitor agency compliance status, and approve certification submissions — all without code changes.

### CAP-07 — Portfolio Intelligence
The state IT authority can analyze application data across all agencies to identify technology duplication, find consolidation opportunities, and surface candidates for shared services. This supports both internal planning and statewide IT investment decisions.
