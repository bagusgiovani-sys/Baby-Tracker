# Sprint 0/1 implementation status

Validated locally on 2026-10-13. Source implementation is present; the complete Sprint 1 definition of done is **not yet satisfied** because installation, full app tooling and device/browser verification are unavailable here. No cloud deployment or real-user data operation was performed.

## Vercel priority follow-up

Added vercel.json with Expo SPA fallback, SQLite isolation headers, WASM content type and a deployment build command. Added upload exclusions and constrained Node to the 22.x line. Deployment now requires valid public HTTPS Supabase settings and a full app typecheck before export. Five synthetic deployment-environment checks passed (valid settings, missing settings, local URL, server-secret key and invalid API path). This exposed and fixed URL validation throwing on empty/malformed strings; the existing environment test now covers both inputs.

Vercel and Supabase integrations were found but are not connected in the latest confirmed state. There is no .env, linked Vercel project, authenticated deployment CLI or Git remote in this workspace. A fresh registry check still failed with ECONNREFUSED. No deployment was attempted without account access. See VERCEL_DEPLOYMENT.md for the prepared configuration and remaining setup.

## Implemented areas

| Area | Files | Behavior |
| --- | --- | --- |
| App foundation | app.json, package.json, tsconfig.json, metro.config.js, app/_layout.tsx | Expo Router, strict TS configuration, responsive shared theme and web WASM headers |
| Authentication/onboarding | app/(auth), app/auth, src/lib/supabase* | Email OTP/callback, baby profile, explicit consent, account-scoped state |
| Today/history/forms | app/(app), src/features, src/components | Baby-scoped totals, 24-hour list, timers, create/edit/delete, local timestamps, explicit conflict choice |
| Localization/settings | src/lib/i18n.ts, src/lib/preferences*, app/(app)/settings.tsx | Indonesian and English, locale/time preferences, baby switching |
| Validation/time | src/domain | Canonical nullable fields, UTC normalization, local-day/DST handling, honest totals |
| Offline storage | src/data/local | Durable event+queue transactions, restart recovery, SQLCipher native adapter, encrypted web payloads |
| Remote sync | src/data/sync, src/data/remote, src/lib/store.tsx | Idempotent receipts, expected versions, backoff, tombstones, delta pagination, explicit conflicts |
| Backend | supabase/migrations | Normalized typed records, grants/RLS, consent, audit, membership, private receipts and authorized RPCs |
| Clinical boundaries | src/domain/features.ts, app/safety.tsx | Disabled unreviewed features, general emergency signposting, external safe-sleep education |
| Tooling/docs | scripts, tests, .github/workflows, README.md, docs | Synthetic local seed helper, test suites, CI definition, setup and reversal guidance |

## Actual validation results

- `npm run test:offline`: passed after the final source changes. Strict typecheck of domain, repository, storage helpers and sync worker passed; all client TS/TSX parsed successfully. This is not a full application typecheck.
- Domain/environment/storage/queue tests: **27 passed, 0 failed**. Includes actual SQLite close/reopen and transaction rollback, lost acknowledgements, stale edits, retry ordering, revocation, DST, language parity, encryption/tamper checks and clinical feature gates.
- Embedded PostgreSQL tests: **13 passed, 0 failed** (12 nested cases plus the enclosing integration test). Migrations applied to PGlite with simulated Supabase roles/auth context. Tests include default-grant hardening, cross-family isolation, viewer restrictions, audited edits, invalid-payload rollback, tombstones, idempotency receipts and version conflicts.
- `node --check scripts/seed-local.mjs`: passed.
- TypeScript AST printer formatted 46 TypeScript source/test files; this is not a claim that Prettier passed.

The embedded database harness verifies permission and concurrency contracts through serialized transactions and expected versions. It does not simulate simultaneous remote PostgREST connections or the actual Supabase Auth service. Native SQLCipher/SecureStore integration and real-browser IndexedDB/Web Locks behavior need runtime tests.

## Blocked or unexecuted checks

| Check | Observed limitation |
| --- | --- |
| Full npm installation | Network requests fail through the environment proxy; offline cache lacks Expo packages/metadata. No lockfile produced. |
| `npm run format` / `format:check` | Prettier unavailable. |
| `npm run lint` | ESLint unavailable. |
| `npm run typecheck` | Root TypeScript command/dependency types unavailable; narrower fallback passed. |
| `npm run test:ui` | Jest/React Native test dependencies unavailable; component tests are authored but not run. |
| `npm run build:web` / running app | Expo unavailable. No screenshot or viewport verification was performed. |
| Full local Supabase, seed and auth integration | Docker/Supabase CLI unavailable; no configured cloud project substituted. |
| Dependency audit and CI | Not executed successfully; installed dependency tree and lockfile required. CI definition is unverified. |
| Android/iOS device checks | Development build and devices unavailable. |

Node's experimental SQLite/type-stripping warnings and module-type inference warning occurred during passing tests. No claim of a warning-free release build is made.

## Next acceptance work, before Sprint 2

1. Restore registry access, install dependencies, generate the lockfile and confirm Expo package compatibility. Run Prettier, lint, full TypeScript, all test suites, web export and dependency audit; resolve findings.
2. Run local Supabase migrations and synthetic seed. Configure OTP template, redirects and SMTP for the intended test environment. Exercise real sign-in, onboarding, expiry, sign-out and account switching.
3. Build the native SQLCipher development client and serve the web export with correct isolation headers. Verify phone/tablet/desktop layout, accessible focus/labels, thumb targets and keyboard use.
4. Exercise flight mode, process termination/restart, repeated reconnects, two caregivers, lost responses, tombstones, token expiry and revoked membership against the real backend. Cold offline browser launch remains unsupported until an app-shell cache is implemented.
5. Complete the specified security/privacy and clinical-content review gates before using real infant records. Sharing, deletion/export, daily check-ins and broader health modules remain in their later backlog phases.

Resume in the order of docs/09_IMPLEMENTATION_BACKLOG.md only after Sprint 1 acceptance is complete.
