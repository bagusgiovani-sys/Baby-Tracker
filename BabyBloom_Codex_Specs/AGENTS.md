# Codex Working Agreement — BabyBloom

You are building an infant tracking application. Treat the `.md` files in `docs/` as the authoritative product spec; see `CODEX_START_HERE.md` for the delivery sequence.

## Nonnegotiable constraints
1. Never write clinical diagnosis logic, medication dosage recommendations, custom vaccination catch-up schedules, percentiles/z-scores from unverified tables, or reassurance based on absence of logs.
2. Document all assumptions in `docs/DECISIONS.md` (create if missing); do not silently change field semantics.
3. Default language Indonesian; provide English translations for all user-visible labels. Avoid hardcoded strings in components.
4. Every record is scoped to a baby and a permitted caregiver; enforce authorization on the server with RLS, not just in UI. Never use Supabase service-role secrets in the client.
5. An event can be offline/queued/syncing/synced/error. Render state honestly; retries idempotent.
6. Use UTC instants for event timestamps and IANA timezone for daily summary. Respect daylight saving when supported for international use.
7. Store data units explicitly: weight kg, length/head cm, bottle mL, temperature °C (with measurement site), dose quantity + unit as prescribed.
8. Empty/missing and observed-none are different states. Preserve the recorded-by attribution and audited edits.
9. Do not require photo/medical data uploads for logging; avoid photos in alpha unless private storage policies are implemented.
10. No screenshots, telemetry, analytics or error reporting may leak names, photos, free text, symptoms, tokens, medical details or record IDs into third-party tools.
11. Do not copy proprietary milestone artwork, KIA pages or clinical scales into product assets without checking licenses and permission.
12. Validate type safety, input validation, ownership, accessibility, offline queues and user-facing dangerous-case messaging with automated tests.

## Stack preference
Expo Router, React Native, TypeScript strict mode, React Query (or equivalent), Zod schema validation, Supabase, Postgres SQL migrations, `expo-sqlite` local durable log storage, a test runner suitable for pure domain code plus React Native testing library for components. Pin stable versions compatible with the latest chosen Expo SDK after checking available current dependencies. No unnecessary packages.

## Coding style
- Domain type definitions separate from components; screen components thin.
- Avoid a huge polymorphic `jsonb` blob as the only source of truth: normalized typed detail tables with an event envelope and appropriate CHECK constraints.
- Apply migrations incrementally; include down/reversal guidance where possible.
- Write unit tests alongside each domain capability; integration tests for RLS and concurrent updates.
- Don't let unsynced optimistic UI appear permanently confirmed.

## Definition of done for each sprint
- Implementation with tests and no type/lint errors.
- Security policy and access tests for any new table.
- Translated and accessible UI including validation errors.
- Offline behavior explained and tested where applicable.
- Feature flags for incomplete medical features.
- Brief completion note with changed files, commands run, known blockers and next action.
