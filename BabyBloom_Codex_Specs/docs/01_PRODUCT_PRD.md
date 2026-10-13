# 01 — Product Requirements Document (PRD)

## Product statement
**BabyBloom** is an infant care journal and growth/development record for parents and caregivers of babies aged 0–24 months. The app captures fast, timestamped daily care events and offers useful, non-diagnostic summaries. Target launch market: Indonesia; bilingual Indonesian and English. Default locale: Indonesian.

## Goals
1. Record feeding, diaper and sleep activities in seconds, at the moment of care.
2. Present an accurate, auditable 24-hour and calendar-day care summary without inventing missing information.
3. Enable **optional** once-daily check-ins, not a second copy of the activity diary.
4. Preserve weight/length/head measurements, developmental observations, immunization history and appointment notes for handoff to healthcare professionals.
5. Share a single baby record with authorized caregivers, offline as well as online.
6. Provide clinically reviewed educational and safety signposting; avoid diagnosis or unreviewed numerical rules.

## Non-goals in first public release
- Doctor diagnosis, triage chatbot, medical-device monitoring, oximetry, automated infant breathing surveillance, SIDS prevention guarantees.
- Medication prescription/dosing advice, growth disorder diagnosis, infant feeding plans or rigid feeding/sleep quotas.
- Automatic WHO percentile/z-score calculations until WHO dataset, method, corrected-age use and test fixtures are independently verified and clinician-approved.
- Vaccine catch-up calculations until region- and date-versioned official schedule implementation is verified.
- Cloud photo album / social network / location tracking / advertising monetization built on child-health data.

## Users and roles
- **Primary caregiver / Owner:** creates baby record, controls sharing, exports/deletes.
- **Caregiver editor:** logs/edits activities, sees authorized health records.
- **Caregiver viewer:** reads permitted records, cannot create/edit.
- **Clinician:** not a real authenticated role in MVP. Parent can generate a redacted, short-lived PDF report; live clinician portal deferred.
- **Baby:** data subject, not a user account.

## Key jobs to be done
- "I fed my baby. Record it with two or three taps while holding them."
- "How long has the baby slept in the last 24 hours?"
- "Did anyone change a wet diaper while I was away?"
- "What happened before the rash? Let me see food, symptoms and times without inferring cause."
- "Give the pediatrician recent logs and a growth history."
- "My partner logged data offline, so we need obvious sync status and no duplicates."

## Feature boundaries
| Module | Minimum feature | Feature gate / caveat |
|---|---|---|
| Baby profile | DOB, nickname, timezone, gestational age, reference sex | No assumption from name/pronouns |
| Feeding | direct breastfeeding/bottle events, breast side, source, volume if bottle | No estimated breastmilk intake from duration |
| Diaper | wet/dirty/both, stool color/consistency and concerns when dirty | Floating/sinking hidden as non-core; BS scale not a required item |
| Sleep | start/pause/end/edit, naps/night, computed duration | No claim that timer guarantees safe sleep |
| MPASI | meal at time, ingredients, offered/consumed estimate, allergens | Enabled by caregiver when solids begin; age note ~6 mo |
| Supplement/medication | administered dose with unit, time and source | No dose recommendations |
| Maternal food | optional maternal meal log attached to caregiver | No causal inference that maternal meal caused infant symptom |
| Response/symptoms | event-based observations, time, severity wording, temp+site if measured | Serious symptoms open reviewed urgent guidance |
| Mood/activity | optional observations and tummy time/play duration | No mandatory tummy-time score |
| Daily check-in | short `usual/different/unsure` prompts, parent concern | Completion optional; no health score |
| Growth | chronological measurements with provenance | WHO engine gated behind validation |
| Milestones | age-based status and event history | Not a diagnostic screening tool |
| Vaccines | dose history and reminder-only by user appointment | Auto schedule gated by official version |
| Export | PDF and CSV via authenticated backend and share sheet | Access controlled; short-lived signed URLs |

## Main routes / navigation
- `/onboarding`: welcome, consent, locale, baby profile, sharing (later).
- `/today`: summary, fast actions, timeline, check-in card.
- `/log`: timeline/filter/edit + category log forms.
- `/growth`: raw measurement history/chart; WHO when verified.
- `/development`: milestone periods and observation status.
- `/health`: symptoms, vaccines, meds/supplements, appointments, exports.
- `/settings`: baby switch, caregivers, language, data privacy/delete.

## Success metrics (design targets, not medical claims)
- 90% of test participants can log a diaper change without instruction.
- Common log entry <= 3 interactions after quick-action selection for default paths.
- Median ordinary daily check-in < 60 seconds during usability tests.
- Zero cross-baby unauthorized access in automated RLS suite.
- 100% of pending/offline events still recoverable after a forced restart in offline testing.
- Export includes time, units, event provenance and data completeness annotation.
- 100% of personalized calculations cross-checked against approved fixtures before feature flags enabled.

## Design tone
Reassuring without falsely reassuring. Plain language and medically precise where needed. No competition, leaderboards, streak guilt, green "perfect baby" scores or selling health data.

## Pending product decisions (do not block Sprint 0/1)
- App name/branding ownership.
- Whether multi-baby support is launch-blocking (schema must support it).
- Whether a caregiver may see maternal meal notes; default private to that caregiver, not household-wide.
- Whether parent opts into photo attachments; default off in alpha.
- Whether Google/Apple sign-in supported at launch (email OTP works as baseline).
