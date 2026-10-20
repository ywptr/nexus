# Nexus V0 — Tenant lifecycle & entitlements

Independent Next.js/Vercel + Neon/PostgreSQL service. IS is the identity source. Nexus owns canonical tenant IDs, lifecycle, subscriptions and entitlements; application-specific membership remains with each application.

## Implemented
- Authenticated Nexus operator endpoints: create/list/get/update tenants (soft lifecycle; no destructive DELETE)
- Optimistic version checks for updates and transactional audit for successful tenant mutations
- IS JWT validation using trusted OIDC issuer, Nexus audience and JWKS signature (RS256/ES256/PS256)
- Tenant subscription/plan/entitlement database schema and operator-only entitlement check
- Fail-closed defaults; no implicit tenant access from being a Nexus operator
- Trusted CLI bootstrap for first operator

## Local bootstrap
1. `cp .env.example .env.local`, set Neon connection and IS issuer/audience. Export `DATABASE_URL` to your shell for CLI scripts.
2. `npm install` (Node 20+)
3. `npm run db:migrate`
4. From a trusted administrative shell: `npm run admin:grant -- <IS_SUBJECT>`
5. `npm run dev`
6. Send an **IS-issued Nexus-audience access token** via `Authorization: Bearer ...` to `/api/v1/tenants`.

### API (V0)
- `GET /api/v1/health`
- `GET /api/v1/tenants`
- `POST /api/v1/tenants` with `{ "slug": "acme", "display_name": "Acme" }`
- `GET /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id` with `{ "version": 1, "status": "suspended" }`
- `POST /api/v1/entitlements/check` with `{ "tenant_id": "uuid", "product": "ig", "feature": "image_generation" }`

## Integration contracts still to validate
The IS repo/token issuer was not available in this session. This scaffold **assumes** IS issues JWT access tokens with verifiable JWKS, exact `iss`, `aud` and stable `sub`. Browser-based authorization code + PKCE, local session cookies, IS client registration, and any differences in IS discovery URLs must be integrated against the actual IS implementation. Do **not** treat Google ID tokens as Nexus API access tokens.

## Next implementation slices
1. Verify actual IS OIDC issuer and client registration; implement browser login/session in Nexus (PKCE), CSRF defenses and secure cookies.
2. Expose trusted machine-to-machine application clients with scoped audience/permissions; never reuse operator privileges for service checks.
3. Add protected plan/subscription/override CRUD and transactional audits.
4. Add a CLI/admin UI with tenant creation, entitlements, plans and subscriptions.
5. Enforce lifecycle transitions and integrate tenant changes with application provisioning; add outbox/idempotent delivery.
6. Add billing-account design and usage limits; future approval workflow requires independent approvers.

## Security boundaries
- IS authenticates. Nexus alone authorizes platform operators.
- Nexus operators **cannot** read application story/media data or inherit tenant membership.
- Nexus tenant IDs are canonical. Applications map local membership to these IDs.
- All API endpoints except health require valid IS bearer tokens and operator authorization in this scaffold.
- No tenant hard-deletion; decommission and purge must be separate audited processes.
- This is a foundation scaffold, **not production-ready**. Missing integration tests, OIDC browser login, role administration, app client authorization, rate limiting and operational monitoring.

## Tenant/application registration policy (V0 foundation)

Apply migration `002_registration_policies.sql` with `npm run db:migrate` (runner now handles both idempotent migrations).

Operator-only endpoints (IS bearer token with Nexus audience):

- `GET /api/v1/tenants/:id/registration-policies/:product`
- `PUT /api/v1/tenants/:id/registration-policies/:product` with `{"mode":"invitation_only","version":null}` on first creation, or the current integer version when updating.

Modes are `closed`, `invitation_only`, `public`. **Missing policies are closed**, and effective admission is always closed for inactive tenants or tenants without a current active/trial subscription. Tenant creation is never public. Policies govern *admission to an existing application tenant*, not IS identity creation or access to unrelated apps. Updates are operator-authorized, optimistic-lock protected, and audited transactionally.

**Important security boundary:** this release stores/edits policy, but intentionally does not expose an unauthenticated admission-check endpoint. Application registration must remain **disabled** until a trusted app-to-Nexus policy-read mechanism and tenant-scoped membership enforcement are built and tested. IS integration is still contingent on the real issuer/JWKS contract; the existing JWT adapter is provisional. Add invitation proof validation, abuse protection, and scoped machine credentials before enabling public signups.
