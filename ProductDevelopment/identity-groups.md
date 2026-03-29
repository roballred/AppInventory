# Identity Groups and Multi-Tenancy

## Overview

Each agency in the system is optionally associated with an `identityGroup` — a string that maps to a group or claim in the identity provider (e.g., Azure AD group object ID or Okta group name).

## Purpose

The `identityGroup` field enables the identity provider to automatically assign users to the correct agency on first sign-in. Without this field, a platform administrator must manually set each user's `agencyId` in the `users` table.

## Cost and Licensing Implications

Leveraging identity provider groups may require additional licensing depending on your IdP:

| Identity Provider | Group Sync Feature | Licensing Tier |
|---|---|---|
| Microsoft Entra ID (Azure AD) | Group claims in tokens | Entra ID P1 or higher |
| Okta | Group push / group claims | Workforce Identity (included in most plans) |
| PingFederate / other | Varies | Consult vendor |

**Entra ID note**: Free-tier Entra ID limits group claims to security groups only. Dynamic groups (auto-assignment by department/UPN) require P1. Budget ~$6–9/user/month if not already licensed.

## Implementation Notes

The `identityGroup` field is stored on the `agencies` table but is **not yet used in application code**. Future work should:

1. Read the identity provider group claim from the JWT/token during the `signIn` callback
2. Look up the matching agency by `identityGroup`
3. Set `agencyId` and `role` on the user record automatically

Until this is implemented, agency assignment is manual via platform admin.

## Security Considerations

- Identity group mapping should be validated server-side, not trusted from client input
- Group membership changes in the IdP take effect on the user's next sign-in (JWT rotation)
- See `infrastructure.md` for token lifetime settings
