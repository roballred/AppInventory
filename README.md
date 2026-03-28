# State Application Inventory

A continuous inventory management web app for state agencies, built for state IT authorities.

---

## For State Adopters

This is a template product designed for any state to adopt. It was originally designed for Washington State and is being released as a generic reference implementation.

**What this means for you:**

- All product design artifacts (data model, business rules, compliance register, roles, UX flow, tech stack) are included as working examples.
- Washington State policies (MGMT-01-01-S, USER-01, RCW 43.105.341, etc.) are cited throughout as examples of the kinds of policies that typically drive this type of product. **Replace these with your own state's applicable policies, standards, and legal requirements.**
- The September 30 annual certification deadline is a Washington State example. Replace it with your state's deadline.
- Microsoft Entra ID is used as the identity provider because Washington State operates a Microsoft tenant. If your state uses a different identity provider, see `tech-stack.json` for guidance on replacing the authentication layer.
- `wa.gov` URLs are included as reference examples — replace with your state's equivalent URLs.
- The compliance register (`compliance-register.json`) lists Washington State compliance requirements as examples. Adopting states should replace these with their own applicable policies and legal mandates.

---

## Purpose

State agencies are required to submit an annual IT certification to the state IT authority that includes an Application Inventory. Today, agencies complete an Excel spreadsheet and submit it once a year. The data that comes back is inconsistent, often out of date, and hard to aggregate across state agencies.

This product replaces the spreadsheet with a web app where agencies maintain their application inventory continuously throughout the year. Annual certification becomes a review and attestation step — not a data entry event.

---

## How This Repo Is Organized

```
AppInventory/
├── README.md                          ← You are here — start here
├── Dockerfile                         ← Multi-stage production container build
├── docker-compose.yml                 ← Local dev: spins up app + PostgreSQL
├── .env.example                       ← Environment variable template — copy to .env.local
├── .gitignore                         ← Excludes secrets and build artifacts
└── ProductDevelopment/                ← All product design artifacts
    ├── capabilities.json              ← Business capabilities
    ├── business-rules.json            ← Configurable business rules
    ├── tech-stack.json                ← Technology decisions and rationale
    ├── data-model.json                ← Data entities and fields
    ├── roles-permissions.json         ← Roles and what each can do
    ├── ux-flow.json                   ← Screen-by-screen UX flow
    └── compliance-register.json       ← Compliance requirements tracker
```

---

## How This Product Was Designed

This product was designed using a business-first approach — starting with customer needs and working inward to capabilities, data, and technology decisions. Every decision in this repo follows that sequence.

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
| PostgreSQL | Open source, well-suited to structured relational data — runs locally via Docker, or managed on any cloud |
| Microsoft Entra ID (state tenant) | For Microsoft-tenant states: agencies already authenticate here — no new identity system required. See `tech-stack.json` for guidance on replacing with a different identity provider. |
| Azure App Service hosting | Recommended for Microsoft-tenant states — same tenant simplifies security and compliance. Any cloud or on-prem works when using containers. |
| Azure Communication Services | Email notifications within Azure tenant — replaceable with any transactional email service |
| Tailwind CSS | Fast to build with, maintainable, no heavyweight design system required |
| USWDS (U.S. Web Design System) | Built for government, meets WCAG 2.2 AA, widely used by state agencies |

### Containerization
| Decision | Rationale |
|----------|-----------|
| Docker + docker-compose for local development | `docker-compose up` starts app and database in one command — lowest friction developer onboarding |
| Multi-stage Dockerfile | Separate build and runtime stages — lean production image, no dev dependencies shipped |
| Containerization is optional, not a mandate | States can run from code directly on any platform — containers are an enhancement for portability |
| Three deployment paths supported | Run from code (any state), Docker (portable), Kubernetes/AKS (larger states with container infra) |
| `.env.example` provided | Documents all required environment variables — copy to `.env.local` to get started |

### Data
| Decision | Rationale |
|----------|-----------|
| Fields derived from state IT portfolio policy (Washington State MGMT-01-01-S used as example) | Policy already defines the required data model — no need to reinvent. Adopting states should map fields to their own policy standard. |
| Full field-level audit history | Powers staleness detection, refresh rate metrics, and compliance audit trails |
| No hard deletes — ever | Government data must be retained; retire is a lifecycle status change, not a deletion |
| Retire and revert available to submitters | Submitters maintain records day-to-day; restricting retire to admins creates bottlenecks |
| JSONB for audit field changes | Flexible schema for capturing any field change without a schema migration |

### Access Control
| Decision | Rationale |
|----------|-----------|
| Agency-scoped data access | Agencies must not see each other's inventory — enforced at application level, not just UI |
| 4 roles: platform_admin, agency_admin, submitter, viewer | Matches real operational needs without over-engineering permissions |
| platform_admin is the only cross-agency role | Portfolio intelligence requires cross-agency visibility; all other roles are agency-scoped |

### Business Rules
| Decision | Rationale |
|----------|-----------|
| Business rules configurable by platform admin (no deployment) | Policy thresholds change regularly — deploying code for a number change is wasteful |
| Alert engine built as generic rules processor | Agency-defined alerts are a future feature; building generic from day one avoids a rebuild |
| Stale records block certification submission | Enforcement mechanism that drives continuous maintenance without external policy pressure |

### Compliance
| Decision | Rationale |
|----------|-----------|
| WCAG 2.2 AA (not 2.1) | Washington State mandate transitions to 2.2 AA by July 1, 2026 (used as example). Adopting states should verify their own accessibility mandate version and deadline. |
| Privacy assessment required before launch | App collects user PII via identity provider — privacy policy typically requires assessment even for internal tools |
| Infrastructure inventory deferred to future release | Out of scope for v1; COMP-03 in compliance register tracks this for future work |

---


## What Is Not Yet Done

| Item | Notes |
|------|-------|
| Azure infrastructure provisioning | Azure tenant and subscription required from state IT authority infrastructure team. See `tech-stack.json` for decisions and assumptions. |
| Identity provider group and role configuration | Agency groups need to be configured in the state identity provider tenant |
| Application build | No code has been written yet — all artifacts above are design/planning |
| Privacy assessment | COMP-06 — required before launch |
| Security review | COMP-07 — identity provider configuration review required before launch |
| Accessibility audit | COMP-01 — automated and manual testing required before launch |
| Infrastructure inventory (v2) | COMP-03 — deferred from v1 |
| Agency-defined alerts (v2) | Alert engine is built generically to support this; feature deferred from v1 |

---

## Compliance Summary

All compliance requirements are tracked in `ProductDevelopment/compliance-register.json`. The requirements listed are based on Washington State policies and are included as examples. Adopting states should replace these with their own applicable mandates.

| Requirement | Deadline | Status |
|-------------|----------|--------|
| WCAG 2.2 AA (example: USER-01) | July 1, 2026 (WA State example) | In design |
| IT Portfolio — Application Inventory (example: MGMT-01-01-S) | Sept 30 annually (WA State example) | Addressed in data model |
| Legislative Reporting (example: RCW 43.105.341) | Ongoing | Addressed in CAP-07 |
| Annual Certification Deadline | Sept 30 annually (WA State example — replace with your state's deadline) | Addressed in business rules |
| Privacy Assessment | Before launch | Needs assessment |
| Security Review | Before launch | Architecture decided |
| AI Application Identification | Sept 30 annually (WA State example) | Addressed in data model |

---


## For Developers Picking Up This Work

**Local setup — get running in 3 steps:**
```bash
git clone https://github.com/roballred/AppInventory
cp .env.example .env.local      # fill in your identity provider values
docker-compose up               # app at http://localhost:3000
```

**Before writing any code, read these in order:**
1. **This README** — every decision and why it was made
2. **`compliance-register.json`** — compliance requirements constrain implementation choices. Washington State requirements are examples — replace with your state's mandates.
3. **`data-model.json`** — understand the entities and relationships first
4. **`roles-permissions.json`** — access control must be enforced at the API level, not just the UI
5. **`business-rules.json`** — notification and alerting logic is driven by configurable rules, not hardcoded values

**Before deploying:**
- Provision cloud infrastructure (see `tech-stack.json` for decisions and assumptions)
- Configure identity provider groups and role assignments
- Complete privacy assessment (COMP-06) and security review (COMP-07)
- Run accessibility audit against WCAG 2.2 AA (COMP-01)

---

## Policies and Standards Referenced

The following are Washington State policies used as examples in this reference implementation. Adopting states should identify and substitute their own equivalent policies.

- [MGMT-01 Technology Portfolio Foundation Policy](https://watech.wa.gov/policies/technology-portfolio-foundation) (example — replace with your state equivalent)
- [USER-01 Digital Accessibility Policy](https://watech.wa.gov/policies/digital-accessibility-policy) (example — replace with your state equivalent)
- [RCW 43.105.341 — IT Portfolios](https://app.leg.wa.gov/rcw/default.aspx?cite=43.105.341) (example — replace with your state equivalent)
- [State IT Authority Annual Certification](https://watech.wa.gov/2024-annual-certification) (example — replace with your state equivalent)
- [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
