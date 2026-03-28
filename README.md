# State Application Inventory

A continuous inventory management web app for state agencies, built for state IT authorities.

---

## For State Adopters

This is a template product designed for any state to adopt. It was originally designed for Washington State and is being released as a generic reference implementation.

**What this means for you:**

- All product design artifacts (data model, business rules, compliance register, roles, UX flow, tech stack) are included as working examples in `ProductDevelopment/`.
- Washington State policies (MGMT-01-01-S, USER-01, RCW 43.105.341, etc.) are cited throughout as examples of the kinds of policies that typically drive this type of product. **Replace these with your own state's applicable policies, standards, and legal requirements.**
- The September 30 annual certification deadline is a Washington State example. Replace it with your state's deadline.
- Microsoft Entra ID is used as the identity provider because Washington State operates a Microsoft tenant. If your state uses a different identity provider, see `ProductDevelopment/tech-stack.md` for guidance on replacing the authentication layer.
- The compliance register (`ProductDevelopment/compliance-register.md`) lists Washington State compliance requirements as examples. Adopting states should replace these with their own applicable policies and legal mandates.

---

## Purpose

State agencies are required to submit an annual IT certification to the state IT authority that includes an Application Inventory. Today, agencies complete an Excel spreadsheet and submit it once a year. The data that comes back is inconsistent, often out of date, and hard to aggregate across state agencies.

This product replaces the spreadsheet with a web app where agencies maintain their application inventory continuously throughout the year. Annual certification becomes a review and attestation step — not a data entry event.

---

## How This Repo Is Organized

```
AppInventory/
├── README.md                          ← Start here
├── Dockerfile                         ← Multi-stage production container build
├── docker-compose.yml                 ← Local dev: one command starts app + database
├── .env.example                       ← Environment variable reference
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts                  ← Database migration configuration
├── src/
│   ├── app/                           ← Next.js App Router pages and API routes
│   │   ├── page.tsx                   ← Landing page
│   │   ├── login/                     ← Sign-in page (dev bypass or SSO)
│   │   ├── dashboard/                 ← Post-login landing (role-aware)
│   │   └── api/auth/                  ← NextAuth API route
│   ├── components/                    ← Shared UI components
│   ├── lib/
│   │   ├── auth/                      ← NextAuth config and dev bypass accounts
│   │   └── db/                        ← Drizzle ORM connection and schema
│   └── types/                         ← TypeScript type extensions
├── tests/
│   ├── unit/                          ← Jest unit tests
│   ├── e2e/                           ← Playwright end-to-end tests
│   └── fixtures/                      ← Shared test data
└── ProductDevelopment/                ← All product design artifacts (markdown)
    ├── personas.md                    ← User personas and value chain
    ├── capabilities.md                ← Business capabilities (CAP-01 through CAP-10)
    ├── data-model.md                  ← Data entities, fields, and schema evolution policy
    ├── business-rules.md              ← Staleness thresholds, notifications, work queue logic
    ├── roles-permissions.md           ← Roles and permission matrix
    ├── ux-flow.md                     ← Screen-by-screen UX flow by role
    ├── tech-stack.md                  ← Technology decisions and rationale
    └── compliance-register.md        ← Compliance requirements tracker
```

---

## How This Product Was Designed

This product was designed using a business-first approach — starting with user personas and their pain points, then deriving capabilities, and finally making technology decisions. Every decision in this repo follows that sequence and is traceable back to a persona.

The five personas (Jordan, Maria, Derek, Sam, Thomas) form a value chain: Jordan maintaining records enables Maria to trust her data, which enables Derek to analyze clean data, which enables Thomas to answer questions from the Governor's office. The design artifacts in `ProductDevelopment/` document this chain and every decision made along the way.

---

## Key Decisions and Rationale

### Problem Scope
| Decision | Rationale |
|----------|-----------|
| Focus v1 on Application Inventory only | Application data causes more downstream pain than infrastructure data |
| Continuous inventory, not annual-only | Annual submission creates stale data; continuous maintenance keeps it accurate year-round |
| Minimum viable field set (~18 fields) | Fields that change regularly are the ones most likely to be wrong — full field set deferred |
| Stale records block certification | Enforcement mechanism that drives continuous maintenance without external policy pressure |

### Technology
| Decision | Rationale |
|----------|-----------|
| Next.js (App Router) | Full-stack capable, strong ecosystem, single deployment unit for v1 |
| PostgreSQL | Open source, relational, runs locally via Docker or managed on any cloud |
| Drizzle ORM | Type-safe, lightweight, versioned migrations via drizzle-kit |
| Microsoft Entra ID | For Microsoft-tenant states: agencies already authenticate here. Replaceable — see `tech-stack.md`. |
| NextAuth.js | Handles SSO and session management; auth bypass pattern built in for local development |
| Tailwind CSS | Fast to build, maintainable, no heavyweight framework required |
| USWDS (U.S. Web Design System) | Built for government, meets WCAG 2.2 AA |

### Containerization
| Decision | Rationale |
|----------|-----------|
| Docker + docker-compose for local dev | One command starts app and database — lowest friction developer onboarding |
| Multi-stage Dockerfile | Lean production image — no dev dependencies shipped |
| Auth bypass in docker-compose | No identity provider needed to run locally — `AUTH_BYPASS=true` is hardcoded in docker-compose |

### Data
| Decision | Rationale |
|----------|-----------|
| Fields from state IT portfolio policy | Policy defines the required data model — no reinvention needed |
| Full field-level audit history | Powers staleness detection and compliance audit trails |
| No hard deletes — ever | Government data must be retained; retire is a lifecycle status change, not a deletion |
| Additive schema changes only | New fields added with null defaults; fields deprecated, never removed. See `data-model.md` for full schema evolution policy. |

### Access Control
| Decision | Rationale |
|----------|-----------|
| Agency-scoped data access | Agencies must not see each other's inventory — enforced at API level, not just UI |
| 4 roles: platform_admin, agency_admin, submitter, viewer | Matches real operational needs without over-engineering |
| platform_admin is the only cross-agency role | Portfolio intelligence requires cross-agency visibility |

### Business Rules
| Decision | Rationale |
|----------|-----------|
| Configurable by platform admin, no deployment | Policy thresholds change regularly — a code deploy for a number change is wasteful |
| Work queue effort based on field type | Lookup fields (quick) vs. research fields (needs research) — see `business-rules.md` |
| CAP-10 risk flags show Unverified badge | Risk flags are self-reported; unverified data shown with confidence indicator, not hidden |

---

## What Is Not Yet Built

| Item | Notes |
|------|-------|
| Application inventory screens | CAP-01 — next build milestone |
| Agency dashboard and work queue | CAP-09, CAP-10 — depends on CAP-01 |
| Annual certification workflow | CAP-05 — depends on CAP-01 |
| Platform admin screens | CAP-06, CAP-07, CAP-08 |
| Database schema | Drizzle schema to be built incrementally with each capability |
| Email notifications | CAP-04 — deferred until core inventory is working |
| Production identity provider wiring | Auth bypass used locally; production SSO configured in `src/lib/auth/auth.ts` |
| Privacy assessment | COMP-06 — required before launch |
| Security review | COMP-07 — required before launch |
| Accessibility audit | COMP-01 — WCAG 2.2 AA, required before launch |

---

## Compliance Summary

All compliance requirements are tracked in `ProductDevelopment/compliance-register.md`. The requirements listed are based on Washington State policies and are included as examples. Adopting states should replace these with their own applicable mandates.

| Requirement | Status |
|-------------|--------|
| WCAG 2.2 AA | In design — audit required before launch |
| IT Portfolio — Application Inventory | Addressed in data model and capabilities |
| Legislative Reporting | Addressed in CAP-07 (Portfolio Intelligence) |
| Annual Certification | Addressed in business rules and CAP-05 |
| Privacy Assessment | Not started — required before launch |
| Security Review | Architecture decided — review required before launch |
| AI Application Identification | Addressed in data model (AI-enabled flags) |

---

## Developer Setup

**Get running in one command:**
```bash
git clone https://github.com/roballred/AppInventory
cd AppInventory
docker-compose up
```

App runs at **http://localhost:3000**. No identity provider needed — auth bypass is on by default in docker-compose.

**Dev test accounts** (available at the login screen):
| Account | Role | Agency |
|---------|------|--------|
| platform-admin@dev.local | Platform Admin | All agencies |
| agency-admin@dev.local | Agency Admin | Dev Test Agency |
| submitter@dev.local | Submitter | Dev Test Agency |
| viewer@dev.local | Viewer | Dev Test Agency |

**Before writing any code, read these in order:**
1. **This README** — decisions and rationale
2. **`ProductDevelopment/personas.md`** — who this is built for and why each persona matters
3. **`ProductDevelopment/capabilities.md`** — what the product does and why
4. **`ProductDevelopment/data-model.md`** — entities, fields, and schema evolution policy
5. **`ProductDevelopment/roles-permissions.md`** — access control enforced at API level, not just UI
6. **`ProductDevelopment/business-rules.md`** — staleness logic, notifications, and work queue rules

**Running tests:**
```bash
npm test              # unit tests
npm run test:e2e      # end-to-end tests (requires app running)
```

**Before deploying to production:**
- Configure identity provider in `src/lib/auth/auth.ts` — replace `AzureADProvider` if not using Entra ID
- Set `AUTH_BYPASS=false` (or remove it) — never deploy with bypass enabled
- Complete privacy assessment (COMP-06) and security review (COMP-07)
- Run accessibility audit against WCAG 2.2 AA (COMP-01)
- Provision cloud infrastructure (see `ProductDevelopment/tech-stack.md`)

---

## Policies and Standards Referenced

The following are Washington State policies used as examples in this reference implementation. Adopting states should identify and substitute their own equivalent policies.

- [MGMT-01 Technology Portfolio Foundation Policy](https://watech.wa.gov/policies/technology-portfolio-foundation) (example)
- [USER-01 Digital Accessibility Policy](https://watech.wa.gov/policies/digital-accessibility-policy) (example)
- [RCW 43.105.341 — IT Portfolios](https://app.leg.wa.gov/rcw/default.aspx?cite=43.105.341) (example)
- [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
