# Paste this into Codex to start development

Published and verified 2026-10-15: application commit 1708fe7 is pushed to main and deployed READY as dpl_6CrGXqK6RZuoyRnMnKR5daa5cSBs at https://baby-bloom-gio.vercel.app. Live HTTPS checks pass for the final bright pink/blue Candy palette, Home/Profile chunks, onboarding correction, SQLite assets, hosting headers and anonymous report API denial. Full npm run check and guarded export pass. Interactive appearance and authenticated profile saving remain unverified; clinical classification remains unavailable. Historical pending/uncommitted notes below are superseded.

Latest continuation (2026-10-15): final brighter Candy Princess revision, Home/Profile and onboarding repair pass full checks and guarded export. Read the top of `docs/RESUME_CHECKPOINT.md` for publication status; the older checkpoints below are historical.

## Current checkpoint — profile creation repair 2026-10-15

Work resumed after the user reported the baby-profile creation button failing. Read [docs/RESUME_CHECKPOINT.md](docs/RESUME_CHECKPOINT.md) and the latest ONBOARDING-011 entry in [docs/ERRORS_AND_FIXES.md](docs/ERRORS_AND_FIXES.md). Preserve existing Home/Profile changes. Source checks pass 130 cases; production deployment dpl_A17FPdaDQdZsyFG5S9SY6xT5U2jv is READY and its corrected onboarding chunk is verified over HTTPS; a live authenticated save is unverified. Git changes remain uncommitted and unpushed. The foundation sequence below is historical and should not restart completed work.

You are the lead engineer for **BabyBloom**, a bilingual Indonesia-first mobile infant tracking app. Read `AGENTS.md`, `README.md`, and all `docs/*.md`, starting with `docs/02_DAILY_DATA_DICTIONARY.md` and `docs/09_IMPLEMENTATION_BACKLOG.md`. These files are the requirements. **Do not re-plan the product from scratch.**

## Objective
Build a fully functioning Expo/React Native + TypeScript application with Supabase backend and offline-resilient activity logging, organized into small, well-tested vertical slices. Use human-friendly UI and data validation. Do not ship invented medical decisions or unverified statistics. Default UI in Bahasa Indonesia with English translation support.

## First execution: Sprint 0 + Sprint 1 foundation
1. Inspect the repository. If no app exists, create an Expo Router app with strict TypeScript, tab navigation and test tooling suitable for Expo; use compatible stable library versions.
2. Initialize route groups `(auth)` and `(app)`, shared components, localization dictionaries, theme tokens, domain schema layer, typed Supabase client and local SQLite persistence abstraction.
3. Add migrations for profiles, babies, baby memberships, invitations (server-managed), audit events, activity log envelope, typed feeding/diaper/sleep detail tables and daily check-ins. Add RLS and integration tests to prove unauthorized cross-family reads/writes fail. Service-role key server only.
4. Implement authentication and an onboarding flow creating the baby's profile (birth date; gestational age optional; reference-chart sex optional; baby timezone; caregiver consent). Don't require personally identifying data such as full legal name if a nickname suffices.
5. Implement **Today** dashboard with prominent **+ Catat** quick actions (ASI/Susu, Popok, Tidur), 24-hour activity list and visible sync status. All data shown must be baby-scoped; avoid fake daily totals.
6. Implement each logging form following `docs/02_DAILY_DATA_DICTIONARY.md` precisely. Use Zod, optional fields and future-time checks; breastfeeding duration must not be converted to mL. Test save/edit/delete, auto-duration and local-day counters.
7. Build the local mutation queue so edits survive app restarts and unstable connectivity; remote sync must be idempotent by client event ID; resolve server conflicts by surfacing choice where needed, not silent last-write-wins for clinical fields.
8. Add a clear development README, `.env.example` (no secrets), setup commands, migration commands, test commands and demo seed data using synthetic fictional babies only.
9. Run formatting, lint, typecheck, unit and integration tests. Report actual results. **Stop after Sprint 1 and summarize what works and what remains.**

## Design direction
Warm, premium, calm, non-judgmental: soft neutral backgrounds, high contrast labels, large thumb-friendly tap targets, icon + text, no gamified 'baby health score'. One-handed logging should be possible in a few taps. No scary red status without real verified urgent warning. Accessible typography; data understandable in Indonesian.

## Health/safety red lines
- Do not represent the app as expert approved. Medical and legal content marked `REQUIRES_REVIEW` cannot be shipped as personalized care advice.
- Add a reviewed educational safe-sleep page and clear `not a diagnosis/emergency service` notice.
- For <3 months and 38°C or greater, show a prominent prompt to seek immediate clinical assessment, with temperature route considered and clear instructions not to wait for the app. Follow `docs/06_CLINICAL_SAFETY.md`.
- Never generate clinical thresholds, neonatal nutrition recommendations, sleep targets, weight interpretations or medication doses by extrapolation.
- The first release can show raw growth measurements with `Clinical calculation awaiting validation` in place of percentile claims.

## Format each development update
- Implemented (routes / migrations / components)
- Tests run and outcomes
- Security and clinical considerations
- Blockers / unanswered implementation details
- Next backlog task

Continue in later sessions in the exact phase order described in `docs/09_IMPLEMENTATION_BACKLOG.md`.
