# State Application Inventory — Technology Stack

**Product:** State Application Inventory
**Version:** v1
**Last Updated:** 2026-03-27
**Status:** Decisions made — infrastructure not yet provisioned

This document summarizes the technology choices made for the State Application Inventory. It is intended to help infrastructure teams provision and deploy the system independently, without needing to revisit design decisions.

---

## Technology Decisions

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| Web application | Next.js (React) | Full-stack capable, integrates well with Microsoft identity services, widely supported and easy to staff |
| API | Next.js API Routes (built in) | Single codebase for v1 simplicity; can be separated into a standalone API later if needed |
| Database | PostgreSQL (hosted on Azure) | Open source, fully managed, well-suited to structured inventory data |
| Authentication | Microsoft Entra ID | Agencies already use this to log in — no new identity system required |
| Hosting | Azure App Service | Same platform as the identity system, simplifying security and compliance |
| Email notifications | Azure Communication Services | Email within the same Azure environment; no third-party dependency |
| Styling | Tailwind CSS | Fast to build with, easy to maintain for v1 |

---

## Authentication Note

The product is designed primarily for states operating a Microsoft tenant. If your state uses a different identity provider (such as Okta, PingFederate, or Auth0), the authentication layer can be swapped out for any SAML 2.0 or OIDC-compatible provider. Hosting can similarly be moved to any compatible platform if Azure is not in use.

---

## Deployment Options

The application can be deployed three ways. There is no requirement to use containers.

| Option | Description | Best For |
|--------|-------------|----------|
| Run from code | Deploy directly to any platform without containers | All states — works everywhere |
| Docker container | Build and run as a portable container | States that want environment consistency or portability across clouds |
| Kubernetes / AKS | Deploy to a Kubernetes cluster | Larger states that already have container infrastructure in place |

For local development, a single command (`docker-compose up`) starts both the application and the database together.

---

## Infrastructure Checklist

The following items need to be confirmed or provisioned by the infrastructure team before deployment.

- [ ] Confirm Azure tenant for the state IT authority
- [ ] Provision Azure subscription
- [ ] Configure agency groups and role assignments in the state identity provider
- [ ] Provision Azure Database for PostgreSQL
- [ ] Provision Azure App Service
- [ ] Configure Azure Communication Services for email notifications
