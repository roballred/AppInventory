# WaTech Application Inventory

A continuous inventory management web app for Washington State agencies, built for WaTech.

---

## Purpose

Washington State agencies are required to submit an annual IT certification to WaTech that includes an Application Inventory. Today, agencies complete an Excel spreadsheet and submit it once a year. The data that comes back is inconsistent, often out of date, and hard to aggregate across 90+ agencies.

This product replaces the spreadsheet with a web app where agencies maintain their application inventory continuously throughout the year. Annual certification becomes a review and attestation step — not a data entry event.

---

## How This Repo Is Organized

```
AppInventory/
├── README.md                          ← You are here — start here
├── ProductDevelopment/                ← All product design artifacts
│   ├── capabilities.json              ← Business capabilities (EasyEA)
│   ├── business-rules.json            ← Configurable business rules
│   ├── tech-stack.json                ← Technology decisions and rationale
│   ├── data-model.json                ← Data entities and fields
│   ├── roles-permissions.json         ← Roles and what each can do
│   ├── ux-flow.json                   ← Screen-by-screen UX flow
│   └── compliance-register.json       ← Compliance requirements tracker
```

---

## How This Product Was Designed

This product was designed using the **EasyEA framework** — a lightweight, business-first enterprise architecture framework. See [github.com/roballred/EasyEA](https://github.com/roballred/EasyEA) for full framework documentation.

EasyEA starts with the customer and works inward — from customer needs → business capabilities → technology decisions. Every decision in this repo follows that sequence.

### EasyEA Workflow Applied

| Step | What We Did |
|------|-------------|
| 1. Set the Direction | Defined the problem: 90+ agencies submitting inconsistent spreadsheets annually |
| 2. Understand the People | Identified target users: product managers with EA background at WaTech and agency IT staff |
| 3. See How Work Really Happens | Analyzed the existing WaTech spreadsheet template (MGMT-01-01-S fields) and certification process |
| 4. Find the Best Opportunities | Focused v1 on wrong values (inconsistent formats) as the highest-pain problem |
| 5. Choose the Way Forward | Selected continuous inventory over annual-only; chose controlled fields over free text |
| 6. Coordinate the Work | Defined capabilities, data model, roles, UX flow, and compliance requirements |
| 7. Track and Adjust | Established success metrics: data refresh rate and ability to find portfolio insights |

### ARB Review

This product was reviewed by the EasyEA Architecture Review Board (ARB) in **Standard mode** using the following personas:

- **Sarah Kim (Enterprise Architect)** — Confirmed architecture aligns with MGMT-01 portfolio mandate. Flagged Launchpad overlap — resolved by retiring the Launchpad.
- **Omar Singh (Security Architect)** — Confirmed Entra ID is correct. Mandated agency-scoped data access from day one.
- **Lisa Rodriguez (Business Architect)** — Required measurable outcomes: data refresh rate and portfolio insights discovery.
- **Jake Lawson (Veteran Architect)** — Raised enforcement question: why would agencies keep data current? Resolved through configurable alerting and certification blocking.

---

## Key Decisions and Rationale

Every significant decision made during product design is documented here with rationale so any developer, team, or AI tool can understand the context and continue the work.

### Problem Scope
| Decision | Rationale |
|----------|-----------|
| Focus v1 on Application Inventory only | Application data causes more downstream pain than infrastructure data |
| Focus v1 on wrong values (inconsistent formats) | Solving one problem well beats solving all problems poorly |
| Minimum viable field set (~18 fields) | Fields that change regularly are the ones most likely to be wrong — full 84-field set deferred |
| Continuous inventory, not annual-only | Annual submission creates stale data; continuous maintenance keeps it accurate year-round |

### Technology
| Decision | Rationale |
|----------|-----------|
| Next.js (React) | Full-stack capable, excellent Entra ID / MSAL integration, strong ecosystem |
| Next.js API Routes for backend (v1) | Single codebase simplifies v1 deployment; can separate later if needed |
| PostgreSQL on Azure | Open source, fully managed on Azure, well-suited to structured relational data |
| Microsoft Entra ID (WA State tenant) | Agencies already authenticate here — no new identity system required |
| Azure App Service hosting | Entra ID lives in Azure; same tenant simplifies security and compliance |
| Azure Communication Services | Email notifications within same Azure tenant — no third-party dependency |
| Tailwind CSS | Fast to build with, maintainable, no heavyweight design system required |
| USWDS (U.S. Web Design System) | Built for government, meets WCAG 2.2 AA, referenced by WA State agencies |

### Data
| Decision | Rationale |
|----------|-----------|
| Fields derived from MGMT-01-01-S | Policy already defines the required data model — no need to reinvent |
| Full field-level audit history | Powers staleness detection, refresh rate metrics, and compliance audit trails |
| No hard deletes — ever | Government data must be retained; retire is a lifecycle status change, not a deletion |
| Retire and revert available to submitters | Submitters maintain records day-to-day; restricting retire to admins creates bottlenecks |
| JSONB for audit field changes | Flexible schema for capturing any field change without a schema migration |

### Access Control
| Decision | Rationale |
|----------|-----------|
| Agency-scoped data access | Agencies must not see each other's inventory — enforced at application level, not just UI |
| 4 roles: watech_admin, agency_admin, submitter, viewer | Matches real operational needs without over-engineering permissions |
| watech_admin is the only cross-agency role | Portfolio intelligence requires cross-agency visibility; all other roles are agency-scoped |

### Business Rules
| Decision | Rationale |
|----------|-----------|
| Business rules configurable by WaTech admin (no deployment) | Policy thresholds change regularly — deploying code for a number change is wasteful |
| Alert engine built as generic rules processor | Agency-defined alerts are a future feature; building generic from day one avoids a rebuild |
| Stale records block certification submission | Enforcement mechanism that drives continuous maintenance without external policy pressure |

### Compliance
| Decision | Rationale |
|----------|-----------|
| WCAG 2.2 AA (not 2.1) | WA State mandate transitions to 2.2 AA by July 1, 2026 — building to 2.1 would require immediate rework |
| Privacy assessment required before launch | App collects user PII via Entra ID — USER-01 requires assessment even for internal tools |
| Infrastructure inventory deferred to future release | Out of scope for v1; COMP-03 in compliance register tracks this for future work |

---

## What Is Complete

| Artifact | File | Status |
|----------|------|--------|
| Business Capabilities | `ProductDevelopment/capabilities.json` | ✅ Complete |
| Business Rules | `ProductDevelopment/business-rules.json` | ✅ Complete |
| Tech Stack | `ProductDevelopment/tech-stack.json` | ✅ Complete |
| Data Model | `ProductDevelopment/data-model.json` | ✅ Complete |
| Roles & Permissions | `ProductDevelopment/roles-permissions.json` | ✅ Complete |
| UI/UX Flow | `ProductDevelopment/ux-flow.json` | ✅ Complete |
| Compliance Register | `ProductDevelopment/compliance-register.json` | ✅ Complete |

---

## What Is Not Yet Done

| Item | Notes |
|------|-------|
| Azure infrastructure provisioning | Azure tenant and subscription required from WaTech infrastructure team. See `tech-stack.json` for decisions and assumptions. |
| Entra ID group and role configuration | Agency groups need to be configured in WA State Entra ID tenant |
| Application build | No code has been written yet — all artifacts above are design/planning |
| Privacy assessment | COMP-06 — required before launch |
| Security review | COMP-07 — Entra ID configuration review required before launch |
| Accessibility audit | COMP-01 — automated and manual testing required before launch |
| Infrastructure inventory (v2) | COMP-03 — deferred from v1 |
| Agency-defined alerts (v2) | Alert engine is built generically to support this; feature deferred from v1 |

---

## Compliance Summary

All compliance requirements are tracked in `ProductDevelopment/compliance-register.json`. Key mandates:

| Requirement | Deadline | Status |
|-------------|----------|--------|
| WCAG 2.2 AA (USER-01) | July 1, 2026 | In design |
| MGMT-01-01-S Application Inventory | Sept 30 annually | Addressed in data model |
| RCW 43.105.341 Legislative Reporting | Ongoing | Addressed in CAP-07 |
| Annual Certification Deadline | Sept 30 annually | Addressed in business rules |
| Privacy Assessment | Before launch | Needs assessment |
| Security Review (SEC-06) | Before launch | Architecture decided |
| AI Application Identification | Sept 30 annually | Addressed in data model |

---

## EasyEA Framework Improvements

During this product design, 5 improvements to the EasyEA framework were identified and logged as issues in the EasyEA repo:

| Issue | Improvement |
|-------|-------------|
| [#16](https://github.com/roballred/EasyEA/issues/16) | Add "Inherit Existing Data Standards" to capability design step |
| [#17](https://github.com/roballred/EasyEA/issues/17) | Add Business Rules Canvas as standard artifact |
| [#18](https://github.com/roballred/EasyEA/issues/18) | Add Central Services Candidate Register for government EA |
| [#19](https://github.com/roballred/EasyEA/issues/19) | Define ARB persona roles for early-stage ideation |
| [#20](https://github.com/roballred/EasyEA/issues/20) | Add Compliance Register as standard early-stage artifact |

---

## For Developers Picking Up This Work

1. **Read this README first** — it explains every decision and why it was made
2. **Review `compliance-register.json`** — compliance requirements constrain implementation choices
3. **Review `data-model.json`** — understand the entities before writing any code
4. **Review `roles-permissions.json`** — access control must be enforced at the API level, not just the UI
5. **Review `business-rules.json`** — notification and alerting logic is driven by configurable rules, not hardcoded values
6. **Contact WaTech infrastructure team** to provision Azure tenant, subscription, and Entra ID group configuration before beginning deployment work

---

## Policies and Standards Referenced

- [MGMT-01 Technology Portfolio Foundation Policy](https://watech.wa.gov/policies/technology-portfolio-foundation)
- [USER-01 Digital Accessibility Policy](https://watech.wa.gov/policies/digital-accessibility-policy)
- [RCW 43.105.341 — IT Portfolios](https://app.leg.wa.gov/rcw/default.aspx?cite=43.105.341)
- [WaTech Annual Certification](https://watech.wa.gov/2024-annual-certification)
- [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
