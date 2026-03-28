# State Application Inventory — Compliance Register

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27

This document tracks the compliance obligations the product must meet — covering accessibility, policy, privacy, security, and legal requirements. Each item identifies what is required, how the product addresses it, and its current status.

**Note:** Requirements listed here are based on Washington State policies and are included as examples. Adopting states should replace these with their own applicable policies, standards, and legal requirements.

This register should be reviewed at the start of each development sprint and before each major release. Any new policies or standards identified during development should be added as new entries immediately.

**Review owner:** State IT Authority Product Manager

---

## Compliance Requirements

### COMP-01 — Digital Accessibility (WCAG 2.2 AA)

| | |
|-|--|
| **Source** | State digital accessibility policy |
| **What it requires** | All state agency digital services must meet WCAG 2.2 AA |
| **Deadline** | Varies by state. Washington State example: July 1, 2026 for public-facing services; July 1, 2029 for employee-facing tools |
| **How the product addresses it** | The U.S. Web Design System (USWDS) is used throughout — it is built to WCAG 2.2 AA. Any custom components must be audited before release. |
| **Testing required** | Automated accessibility scan (e.g., axe) plus manual screen reader testing before each release |
| **Status** | In design — not yet tested |

---

### COMP-02 — IT Portfolio Management: Application Inventory

| | |
|-|--|
| **Source** | State IT portfolio policy standard |
| **What it requires** | All state agencies must maintain an accurate application inventory and submit it as part of annual certification |
| **Deadline** | Annual — deadline set by state (Washington State example: September 30) |
| **How the product addresses it** | This is the core purpose of the product. Application inventory fields are derived from the state IT portfolio policy's minimum data requirements. Adopting states should map fields to their own policy standard. |
| **Testing required** | Confirm all required fields from the applicable state policy are captured in the data model before launch |
| **Status** | Addressed in data model v1 |

---

### COMP-03 — IT Portfolio Management: Infrastructure Inventory

| | |
|-|--|
| **Source** | State IT portfolio policy standard |
| **What it requires** | All state agencies must maintain an accurate infrastructure inventory |
| **Deadline** | Annual — deadline set by state (Washington State example: September 30) |
| **How the product addresses it** | Out of scope for v1. Infrastructure inventory is planned for a future release. |
| **Testing required** | N/A for v1 |
| **Status** | Deferred to future release |

---

### COMP-04 — Statewide IT Portfolio: Legislative Reporting

| | |
|-|--|
| **Source** | State IT portfolio legislation |
| **What it requires** | The state IT authority must maintain a statewide IT portfolio linking agency objectives, business plans, and technology — used for resource allocation and prioritization by state leadership |
| **Deadline** | Ongoing |
| **How the product addresses it** | The Portfolio Intelligence capability (CAP-07) enables cross-agency analysis and reporting to support legislative reporting requirements |
| **Testing required** | Verify Portfolio Intelligence exports meet reporting format requirements before the first certification cycle |
| **Status** | Addressed in CAP-07 — not yet built |

---

### COMP-05 — Annual Certification Deadline

| | |
|-|--|
| **Source** | State IT authority annual certification process |
| **What it requires** | Agencies must submit their application and infrastructure inventories by the state-defined annual deadline |
| **Deadline** | Annual — deadline set by state (Washington State example: September 30) |
| **How the product addresses it** | The Annual Certification capability (CAP-05) enforces the deadline via configurable business rules. Stale records block submission. Reminder notifications are sent 30 and 7 days before the deadline. |
| **Testing required** | Test certification deadline enforcement and notification triggers before the first certification cycle |
| **Status** | Addressed in business rules and CAP-05 |

---

### COMP-06 — Privacy: Personal Information Collection

| | |
|-|--|
| **Source** | State privacy and data protection policy |
| **What it requires** | Systems collecting personal information must document data collection practices and comply with state privacy requirements |
| **Deadline** | Before launch |
| **How the product addresses it** | The app collects user name and email via the identity provider. No resident personal information is collected. A privacy assessment is required before launch to confirm scope. |
| **Testing required** | Complete the state privacy assessment before launch |
| **Status** | Needs privacy assessment |

---

### COMP-07 — Security: Identity and Authentication

| | |
|-|--|
| **Source** | State security standard for identification and authentication |
| **What it requires** | State systems must enforce strong identity and authentication controls |
| **Deadline** | Before launch |
| **How the product addresses it** | SSO through the state identity provider with MFA enforced at the identity provider level — not custom built. Role-based access enforced within the application. |
| **Testing required** | Security review of identity provider configuration and role enforcement before launch |
| **Status** | Architecture decided — not yet implemented |

---

### COMP-08 — AI Application Identification

| | |
|-|--|
| **Source** | State IT authority AI inventory requirement |
| **What it requires** | Agencies must identify applications using AI and specifically flag applications using Generative AI |
| **Deadline** | Annual — deadline set by state (Washington State example: September 30) |
| **How the product addresses it** | "AI Enabled" and "Generative AI" flags are included as fields on every application record and are reportable through the Portfolio Intelligence view |
| **Testing required** | Verify AI fields are captured and reportable in the Portfolio Intelligence view |
| **Status** | Addressed in data model v1 |

---

## Status Summary

| ID | Requirement | Status |
|----|-------------|--------|
| COMP-01 | Digital Accessibility — WCAG 2.2 AA | In design — not yet tested |
| COMP-02 | Application Inventory Policy | Addressed in data model v1 |
| COMP-03 | Infrastructure Inventory Policy | Deferred to future release |
| COMP-04 | Legislative Reporting | Addressed in CAP-07 — not yet built |
| COMP-05 | Annual Certification Deadline | Addressed in business rules and CAP-05 |
| COMP-06 | Privacy — Personal Information | Needs privacy assessment |
| COMP-07 | Security — Identity & Authentication | Architecture decided — not yet implemented |
| COMP-08 | AI Application Identification | Addressed in data model v1 |
