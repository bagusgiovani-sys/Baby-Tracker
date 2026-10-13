# BabyBloom — Infant Tracker: Codex Build Pack

**Version:** 1.0 draft | **Prepared:** 2026-10-13 | **Product:** mobile-first infant care and longitudinal health record | **Market:** Indonesia-first, Indonesian + English | **Target age:** birth–24 months

> **Status:** Product/engineering specification, **not** an expert-certified or clinically approved medical device. Clinical content, thresholds, growth implementation, privacy compliance and release require qualified review. Do not label the product WHO/AAP/CDC-endorsed.

## Purpose
A practical specification set that an AI coding assistant (Codex) can implement in sequenced, testable increments. Users log everyday baby-care activities in seconds and view automatically generated daily summaries, with separate growth, developmental and health records.

## Critical vocabulary
- **"Menu Moses"** in the reference sheet = foods eaten by a baby named Moses; the app's generic label is **Menu Bayi / MPASI**. This module appears after caregiver activates solids, generally around ~6 months.
- **"Menu Mama"** = maternal foods/snacks; optional, not mandatory or automatically causally associated with infant symptoms.
- **"BS"** in the friend's stool entry is ambiguous; it might mean **Bristol Stool Scale**. The classical Bristol scale is a poor fit for diapered babies. Capture simple consistency, color, volume and selected concerns. Do not treat sinking/floating as clinically meaningful routine data.
- **"Daily" does not mean every field mandatory.** Activity events are logged when they happen; one end-of-day check-in asks only a few questions.

## Files and reading order
1. [`CODEX_START_HERE.md`](CODEX_START_HERE.md): ready-to-paste Codex launch instructions.
2. [`AGENTS.md`](AGENTS.md): constraints for coding agents.
3. [`docs/00_REFERENCE_COMPARISON.md`](docs/00_REFERENCE_COMPARISON.md): mapping the friend's fields to the app.
4. [`docs/01_PRODUCT_PRD.md`](docs/01_PRODUCT_PRD.md): users, scope, priorities, success metrics.
5. [`docs/02_DAILY_DATA_DICTIONARY.md`](docs/02_DAILY_DATA_DICTIONARY.md): **canonical daily field list**, validation, mandatory/optional, dropdown options.
6. [`docs/03_UX_FLOWS.md`](docs/03_UX_FLOWS.md): screens, interactions, localization, accessibility.
7. [`docs/04_DATA_MODEL.md`](docs/04_DATA_MODEL.md): Postgres tables, relationships, constraints, audit model.
8. [`docs/05_ARCHITECTURE_API_SYNC.md`](docs/05_ARCHITECTURE_API_SYNC.md): Expo + Supabase architecture, transactions, offline sync, API contracts.
9. [`docs/06_CLINICAL_SAFETY.md`](docs/06_CLINICAL_SAFETY.md): source-backed guardrails, emergency messaging, non-diagnosis policy.
10. [`docs/07_GROWTH_DEVELOPMENT.md`](docs/07_GROWTH_DEVELOPMENT.md): WHO growth plan, gestational/corrected age, milestones, versions.
11. [`docs/08_PRIVACY_SECURITY.md`](docs/08_PRIVACY_SECURITY.md): child data protection and permissions.
12. [`docs/09_IMPLEMENTATION_BACKLOG.md`](docs/09_IMPLEMENTATION_BACKLOG.md): implementation phases, tasks, dependencies, definition of done.
13. [`docs/10_ACCEPTANCE_TESTS.md`](docs/10_ACCEPTANCE_TESTS.md): Given/When/Then flows, clinical safety, timezones and concurrency.
14. [`docs/11_SOURCES_REVIEW.md`](docs/11_SOURCES_REVIEW.md): authoritative URLs and clinical review sign-off template.

## Decisions already made, for fast start
- **Client:** Expo + React Native + TypeScript + Expo Router; mobile-first iOS/Android (web preview optional).
- **Backend:** Supabase Auth, Postgres with enforced row-level security, Storage, Edge Functions for sensitive actions.
- **Offline:** local SQLite event queue + durable retry; no optimistic claim that remote sync succeeded.
- **Locale:** `id-ID` default, `en` supported; user-selectable 12/24h format; local-day summaries use baby's configured IANA timezone.
- **Release:** private beta only until clinician, privacy and security sign-offs.
- **MVP:** baby profiles; fast feed/diaper/sleep logs; MPASI after enabled; optional maternal meals, medication, symptoms, mood, activity; daily check-in; summaries; corrected-age UI; growth measurement history; milestone observations; vaccine *history*; non-diagnostic safety information; export; caregivers, consent and secure deletion.
- **Deferred behind clinical validation / later phases:** automated growth z-scores/percentiles if not fully validated; automated vaccination due/catch-up rules; detailed symptom triage; paid AI insight claims; any device-based respiratory/SIDS monitoring.

## How to run in Codex
1. Place this entire directory in a new repository.
2. Point Codex at `CODEX_START_HERE.md`; keep `AGENTS.md` at repo root.
3. Have Codex create the application and read the documents in priority order.
4. Do not let Codex invent clinical reference tables or emergency rules. Use source/versioned content only after sign-off.
5. Have Codex implement one milestone at a time, run tests and document blockers.

## Acceptance principle
An absent event means **not recorded**, not "did not happen"; a true `none_reported` daily check-in is distinct from unanswered; a saved item is distinct from a synced item; clinician verification is distinct from self-report.
