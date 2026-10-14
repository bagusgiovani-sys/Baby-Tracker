# 10 — Acceptance Criteria / Test Scenarios

## Automation guidance
Use unit tests for type validation/time math, integration tests against a local Supabase database for RLS and RPCs, React Native component tests for forms, and E2E on iOS/Android simulators for full flows. Fixtures must be fictional and deidentified.

## A. Identity and access
1. **Given** first-time caregiver, **when** registering, **then** consent, baby nickname and DOB are collected, default locale id-ID.
2. **Given** no baby created, **then** dashboard shows empty setup state, not sample clinical records.
3. **Given** viewer role, **when** trying to create/edit records through direct API, **then** forbidden.
4. **Given** other family, **when** guessing baby/event UUID, **then** returns no data and cannot insert/update.
5. **Given** caregiver revoked by owner, **when** next sync occurs, **then** no further baby reads/writes, local authorization state locked down.
6. **Given** owner invites editor, **then** invite token expires and token is single-use; role does not grant access to unrelated baby.
7. **Given** Menu Mama private, **when** another family member queries, **then** not visible; sharing requires explicit consent.
8. **Given** owner deletion request, **when** confirmation passes, **then** family access is revoked and deletion state is auditable.

## B. Feeding
9. **Given** direct breastfeeding timer, **when** stopped, **then** duration is calculated but milk millilitres remain null.
10. **Given** bottle feeding entered with offered 120mL/consumed 80mL, **then** dashboard known intake adds 80mL, not 120mL.
11. **Given** offered 80mL and consumed 100mL, **then** validation error; no network mutation.
12. **Given** bottle consumed amount missing, **then** known intake sum excludes it and shows record incomplete, not 0 consumed.
13. **Given** start later than end, **then** block until corrected.

## C. Diapers
14. **Given** wet+dirty, **then** +1 wet and +1 dirty; one event in timeline.
15. **Given** dirty with all stool details omitted, **then** successful save.
16. **Given** no diapers logged, **then** tile `Belum dicatat`, not verified 0 diapers.
17. **Given** stool color pale/white/grey, **then** reviewed note about professional assessment appears if clinical feature enabled.
18. **Given** diapered infant, **then** BS score and floating/sinking fields are not shown in default form.

## D. Sleep/time
19. **Given** sleep starts 23:50 and ends 00:20 baby's local timezone, **then** day A receives 10m, day B receives 20m.
20. **Given** a future timezone with DST 23h day, **then** calendar-day interval correct and no fixed 24h assumption.
21. **Given** an active sleep, **then** duration shown provisional; saved end null until timer stopped.
22. **Given** two devices try starting same baby's sleep, **then** one active timer enforced and visible server conflict handled.
23. **Given** offline sleep start followed by app restart, **then** elapsed time derives from persisted start, no timer loss.

## E. MPASI and maternal diary
24. **Given** solids disabled, **then** quick log hides MPASI, but user can enable with age/review notice.
25. **Given** MPASI offered amount unknown, **then** parent can still save meal name and time.
26. **Given** symptom after new food, **then** app records association only, never diagnoses food allergy.
27. **Given** Menu Mama entry, **then** baby summary doesn't automatically share or correlate it.

## F. Symptoms and safety
28. **Given** baby under 3 months with temp >=38°C, **when** recorded, **then** immediate reviewed urgent assessment prompt is shown before final save, with measurement-site consideration; rule signed off before public use.
29. **Given** breathing trouble or blue-grey skin selected, **then** emergency instructions shown immediately, offline, without paywall or waiting for network.
30. **Given** normal sneeze or burp log, **then** no alarm by default.
31. **Given** user opens app with no symptoms logged, **then** app does not conclude healthy or no symptoms.
32. **Given** medication dose entered without unit and status given, **then** form refuses save; no dose recommendation is presented.

## G. Daily check-in
33. **Given** unanswered fields, **when** saving draft, **then** blank values preserved and not treated as negative/no.
34. **Given** a check-in from another device same baby and day, **then** update yields versioned conflict, no duplicates.
35. **Given** check-in completed, **then** summary says saved, not "baby normal".
36. **Given** no daily check-in, **then** no red health-warning notification solely for missing check-in.

## H. Growth/development/clinical
37. **Given** preterm age 16 chronological weeks with GA 32 weeks, **then** corrected age shown approximately 8 weeks; age basis explained.
38. **Given** reference sex absent, **then** raw measurement records available, sex-specific charts not computed.
39. **Given** WHO reference not verified, **then** no percentile, z-score or growth diagnosis displayed.
40. **Given** growth event created at clinic, **then** source label does not falsely assert third-party verification.
41. **Given** developmental milestone `not yet`, **then** no diagnosis/overdue push.
42. **Given** vaccine history absent, **then** app does not assume dose missed; local schedule automatic rules remain disabled until reviewed.

## I. Sync and export
43. **Given** device offline, **when** saving a feed and force-quitting, **then** reopen shows locally queued record.
44. **Given** queued event resend twice, **then** server contains one record (idempotent event/mutation IDs).
45. **Given** offline delete then delayed older create, **then** server tombstone takes precedence; event not resurrected.
46. **Given** two editors change same medication event, **then** second receives conflict and can review before replacement.
47. **Given** export requested by outsider/viewer without permission, **then** server rejects.
48. **Given** export successfully generated, **then** file clearly notes reporting period/timezone and completeness, is accessible only by authorized user and URL expires.
49. **Given** crash analytics, **then** no notes, baby DOB, medical values, email, tokens or photos emitted.
50. **Given** account switch, **then** former user's baby data does not appear under new user.

## Quality gates / definition of done
- Every release: TypeScript compile, lint, unit + integration suites, a11y snapshot/manual checks, SQL RLS adversarial tests, offline/restart test, no known critical vulnerabilities.
- Public beta: real-device app lifecycle tests, security and legal checks, clinical copy signoff, privacy notice, backup recovery, deletion/export validation.
- WHO engine: parity with official WHO outputs at approved cases and reviewed age/sex/gestational policy; no percentile before that.
