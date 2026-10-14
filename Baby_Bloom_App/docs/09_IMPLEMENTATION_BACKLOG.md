# 09 — Codex Implementation Backlog / Sequenced Milestones

## Execution rules
One small vertical slice at a time; run tests before moving on. Keep a `docs/DECISIONS.md` with assumptions. Use synthetic data only. Every database change needs RLS tests. The **first working release** is a safe, private care diary, not a self-diagnosing clinical app.

## Sprint 0 — Repository foundation
**Tasks**
- S0-1 Generate Expo Router + TypeScript strict app, pinned versions, `pnpm`/`npm` choice documented.
- S0-2 Configure ESLint, Prettier, path aliases, typed env validation, i18n (`id-ID`, `en`).
- S0-3 Supabase local/staging config, SQL migration runner, authentication deep links.
- S0-4 SQLite repository and durable queue abstractions; secure storage threat model.
- S0-5 Layout/theme/tabs, a11y primitives, blank/error/sync states.
- S0-6 CI: lint, typecheck, test, migrations, dependency audit; `.env.example`.
**Done when** fresh clone boots, tests run, no production data or secrets, language switch works, screen reader labels work.

## Sprint 1 — Profiles + core tracking (highest priority)
**Tasks**
- S1-1 DB: `profiles`, `babies`, `baby_memberships`, `guardian_consents`, audit; create-baby RPC; RLS and authorization tests.
- S1-2 Auth: email login, consent, baby onboarding, choose baby, timezone.
- S1-3 `care_events` envelope + typed `feeding_details`, `diaper_details`, `sleep_details`, transactional save/delete endpoints and RLS.
- S1-4 Zod forms for feeding, diaper and sleep per daily dictionary.
- S1-5 Today dashboard, activity timeline and automatic totals with missing-state semantics.
- S1-6 Offline queue: persist, retry, idempotency, display sync status, restart recovery.
- S1-7 Timer concurrency: one active sleep per baby; safe end/edit logic; timezones/day clipping.
**Done when** a parent can offline-log feed, diaper and sleep; restart; reconnect; see no duplicate, and second family cannot access baby.

## Sprint 2 — Daily check-in + optional daily modules
- S2-1 `daily_checkins`: 1 per baby per local date; nullable tri-state fields, drafts, conflicts.
- S2-2 Check-in UX, follow-ups, honest not-answered semantics and non-reassuring completion.
- S2-3 MPASI opt-in, typed meal data, ingredient/allergen notes (no causal inferences).
- S2-4 Medication/supplement **recording** (never dosing recommendations).
- S2-5 Symptom observation with temp/site, color observations, offline serious-condition informational flow using clinician-approved content bundle.
- S2-6 Mood/activity logging; optional private Menu Mama and privacy visibility tests.
**Done when** 10 data categories are represented, conditional, translatable, unit-validated, with no needless daily mandatory fields.

## Sprint 3 — Longitudinal health history
- S3-1 Raw growth measurement entry, charts as measurements vs time, provenance.
- S3-2 Chronological and corrected-age UI (clinically reviewed text).
- S3-3 Milestone catalogue and observations; use only permitted/licensed, reviewed content.
- S3-4 Vaccination **history** (not automatically generated schedule), appointments, clinician questions.
- S3-5 PDF/CSV exports using secured backend; selection/redaction and expiry.
**Done when** a caregiver can record measurements/milestones/vaccines and export an accurate, clearly labeled report.

## Sprint 4 — Family collaboration and release hardening
- S4-1 Invitations, role changes, revocation, multi-device sync and notifications respecting privacy.
- S4-2 Local encrypted data review, rate limits, privacy requests/deletion, export security, audit.
- S4-3 iOS/Android end-to-end tests, usability tests with parents, keyboard/a11y tests.
- S4-4 Clinician, pediatric nutrition and privacy expert reviews; updates signed off.
- S4-5 Private beta feature flags, incident runbook, release notes, reporting policy.
**Done when** clinical/legal/security release gates passed and regressions zero for high-priority flows.

## Sprint 5 — Advanced, gated after validation
- S5-1 Official WHO data tables and validated LMS/anthro calculation parity tests; enable centile UI only after clinical sign-off.
- S5-2 Vaccination catalogue with updated Kemenkes region/version and validated due/catch-up behavior; only enable after clinical review.
- S5-3 Parent-friendly observational analytics (not diagnosis), personalized reminders only with consent.
- S5-4 Optional clinician portal/interoperability and richer reports; optional safe educational content.
- S5-5 Family support/export interoperability, product experimentation with privacy-preserving analytics.

## Task dependencies
```
S0 -> S1
S1 -> S2 -> S3 -> S4(private beta)
             ↘ S5(validated enhanced clinical features only after expert review)
```

## Recommended agent boundaries
- Front-end agent: UI/screens/i18n/a11y/forms.
- Domain engineer: types/validation/time math/aggregations/tests.
- Backend engineer: SQL/RLS/functions/audit/sync.
- Clinical governance reviewer: reference versions and rule review; cannot be substituted by an AI agent.
- QA engineer: E2E/contract/security/timezone cases.

## Issues format
Every task ticket includes: ID, user story, affected routes, data schema changes, feature flag, tests, threat/safety considerations, done criteria. Reject vague issues like "build tracking" without measurable state transitions.
