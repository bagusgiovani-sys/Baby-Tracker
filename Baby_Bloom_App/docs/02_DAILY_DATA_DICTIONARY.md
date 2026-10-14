# 02 — Canonical Daily Data Dictionary and Form Contracts

**Priority:** P0 = core quick log, P1 = first beta module, P2 = optional/deferred. `Req` = required to save this *specific event*, not required daily. Every event has a generated UUID `event_id`, `baby_id`, event time, caregiver attribution and sync state. All input texts in Indonesian and English.

## A. Feeding / ASI & Susu — P0
Type discriminator `feeding_kind`: `direct_breast`, `expressed_breastmilk_bottle`, `formula_bottle`, `mixed_bottle`, `other_bottle`.

| Field (code) | UI label (ID) | Type/options | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Jam mulai | instant | yes | default now, editable; store UTC |
| `ended_at` | Jam selesai | instant | conditional | breastfeeding timer when ended; >= start |
| `feeding_kind` | Jenis pemberian | enum | yes | direct/bottle types above |
| `breast_side` | Sisi payudara | `left/right/both/unknown` | for direct, optional | do not require if unknown |
| `volume_offered_ml` | Volume disiapkan | decimal(6,1) | bottle optional | >=0, <2000; do not confuse with consumed |
| `volume_consumed_ml` | Volume diminum | decimal(6,1) | bottle optional | >=0 <= offered when offered known |
| `duration_seconds` | Durasi | calculated from start/end | not typed | timer, may be null if partial |
| `notes` | Catatan | short text ≤1000 | no | never needed for 1-tap default |

Avoid infant intake totals when exclusively directly breastfeeding: direct breastfeeding events have duration but **no inferred mL**. Feeding session count = count of complete/incomplete recorded feed events, not biological frequency claim.

## B. Diaper / BAK & BAB — P0
One event covers one diaper change; `diaper_kind`: `wet`, `dirty`, `both`, `dry`. `dry` has no hydration inference. For toilet-trained future children, outside MVP, customize stool observations separately.

| Field | Label | Type/options | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Jam ganti popok | instant | yes | time zone correctly displayed |
| `diaper_kind` | Kondisi popok | wet/dirty/both/dry | yes | wet count increments for wet OR both |
| `stool_color` | Warna pup | `yellow`, `brown`, `green`, `black`, `red`, `pale_white_grey`, `other`, `unknown` | when dirty optional | allow multiple observations? one primary color + notes |
| `stool_consistency` | Tekstur pup | `watery`, `soft`, `pasty`, `formed`, `hard`, `unknown` | when dirty optional | parent-friendly; no Bristol number |
| `stool_amount` | Banyaknya pup | `small/medium/large/unknown` | no | subjective |
| `blood_seen` | Terlihat darah? | `yes/no/unsure/not_observed` | no | don't equate blank with no |
| `mucus_seen` | Lendir? | same | no | observation only |
| `urine_unusual` | Warna pipis tidak biasa? | yes/no/unsure | no | only if wet |
| `rash_present` | Ruam popok | yes/no/unsure | no | optional |
| `notes` | Catatan | text ≤1000 | no | no routine sinking/floating |

**Comparison with friend's form:** fields `BS` and `tenggelam/mengambang` are NOT mandatory. If business insists, add `legacy_bristol_value` or `float_status` behind an experimental toggle with disclaimer, but never put either in clinical logic or main form. Classic Bristol score is not designed for diapered infants. A validated infant scale (BITSS) requires review and permission to reproduce photographs.

## C. Sleep / Pola Tidur — P0
| Field | Label | Type | Req? | Rules |
|---|---|---|---|---|
| `started_at` | Mulai tidur | instant | yes | now default |
| `ended_at` | Bangun | instant nullable | no | null means active timer |
| `sleep_kind` | Jenis tidur | `nap/night/unspecified` | no | auto suggestion based on time is editable |
| `interruptions_count` | Terbangun | integer 0..30 | no | default unknown, not 0 |
| `notes` | Catatan | short text | no | no sleep-quality diagnosis |

Duration computed, not manually required. Prevent end < start; one active sleep timer per baby per caregiver? enforce one active sleep session **per baby** for shared timeline; allow caregiver to end partner-started timer if editor; ensure conflict handling. Aggregate across midnight using overlapping intervals and baby's configured timezone; show 24h rolling and calendar-day totals with clear labels. No rigid 'sleep quality' grade.

## D. Baby meals / Menu Bayi / MPASI — P1, age-dependent
**"Menu Moses" = food eaten by the baby named Moses; rename to generic `Menu Bayi / MPASI`.** Hide by default until caregiver enables `solids_started_on` (typically about six months after birth). If caregiver activates early, offer educational review and option to consult pediatrician; never block legitimate clinician-directed situations.

| Field | Label | Type | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Jam makan | instant | yes | time |
| `meal_name` | Menu | text ≤120 | yes | e.g. bubur ayam |
| `ingredients` | Bahan makanan | string array | no | labels must not imply allergen safety |
| `texture` | Tekstur | puree/mashed/minced/finger_food/regular/other | no | age-appropriate label guidance reviewed |
| `portion_offered` | Porsi disajikan | amount + unit | no | gram/mL/tsp/tbsp/piece/custom, approximate |
| `portion_consumed` | Porsi dimakan | amount + unit | no | allow "tidak tahu"; don't enforce mismatched units |
| `new_food` | Makanan baru? | yes/no/unsure | no | note |
| `allergen_tags` | Bahan alergen | string array from configured set | no | optional record not diagnosis |
| `reaction_notes` | Respon setelah makan | text / linked symptom event | no | timing correlation ≠ cause |

## E. Suplemen & Obat Bayi — P1
| Field | Label | Type | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Jam pemberian | instant | yes | actual administration time |
| `substance_name` | Nama suplemen/obat | text | yes | exact as label/prescribed |
| `category` | Kategori | supplement/medication/other | yes | categorical |
| `dose_value` | Dosis | decimal | yes when given | preserve precision |
| `dose_unit` | Satuan dosis | `mL`, `mg`, `mcg`, `drops`, `IU`, `tablet`, `other` | yes when given | no implicit conversion |
| `status` | Status | given/missed/declined/partial | yes | missed event != administered |
| `prescriber_notes` | Catatan instruksi dokter | free text | no | user entered; not auto-generated |
| `notes` | Catatan | free text | no | no dose suggestions |

Dose/unit validation prevents negative inputs and accidentally swapped units; never infer safe dosing by age/weight or give automated reminders without user-entered instructions.

## F. Symptoms / Kondisi Fisik & Respon — P1
Event types: `rash`, `spit_up`, `vomiting`, `diarrhea`, `cough`, `runny_nose`, `sneeze`, `burp`, `gas`, `skin_color_change`, `breathing_concern`, `unusual_sleepiness`, `poor_feeding`, `other`. **Routine burp/fart/sneeze optional**; do not require counts. Symptoms can have multiple tags attached to one observation event.

| Field | Label | Type | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Waktu pengamatan | instant | yes | allow backdate |
| `symptom_codes` | Respon/gejala | nonempty string[] | yes | multiple supported |
| `description` | Catatan gejala | text | no | non-diagnostic |
| `temperature_c` | Suhu tubuh | decimal (°C) | no | require `temperature_site` if provided |
| `temperature_site` | Cara pengukuran | rectal/axillary/temporal/tympanic/other/unknown | if temp | explicit site, no false accuracy |
| `severity_self_report` | Menurut orang tua | mild/moderate/severe/unsure | no | severity input is subjective; not risk triage |
| `skin_color_observation` | Warna kulit | usual/pale/yellow/blue_grey/red/other/unsure | no | dangerous selections open immediate reviewed safety information |
| `photo_id` | Foto | private attachment reference | no | behind feature flag pending security |
| `related_meal_id` | Terkait makanan sebelumnya | optional UUID | no | linking ≠ confirming allergy |

If caregiver selects `breathing_concern`, `blue_grey`, `unresponsive` (available via 'other serious concern' entry), do not hide or gate emergency instructions behind a completed form. See `06_CLINICAL_SAFETY.md`.

## G. Mood & Aktivitas — P1
| Field | Label | Type | Req? | Rules |
|---|---|---|---|---|
| `occurred_at` | Jam | instant | yes | time |
| `mood` | Mood | calm/happy/fussy/sleepy/low_energy/unsure | optional | no objective emotional diagnosis |
| `activities` | Aktivitas | tummy_time/play/reading/singing/outdoor_time/other | optional | at least mood OR activity to save |
| `duration_seconds` | Durasi aktivitas | positive int | optional | can be null |
| `observations` | Catatan | text | optional | e.g. smiling, reaching |

## H. Menu Mama — P2 opt-in (default OFF)
A separate **caregiver-owned** diary, not infant health event. Private to the author by default; not visible to partner/export unless explicit opt-in. Fields: `occurred_at` optional, `meal_name` required, `meal_type` optional (meal/snack/drink), `ingredients` optional, `caffeine_note` optional, `notes` optional. Don't infer breastmilk contents or allergies from maternal meals. Don't auto-correlate infant symptom with maternal food as causality.

## I. Daily Wellbeing Check-in — P0/P1
One per baby, local **calendar date** (`day_key`), editable. Never make check-in mandatory and don't imply missing check-in is a safety signal. Prepopulate statistics from activity logs but **do not overwrite user observations**.

| Field | Label | Type/options | Req? |
|---|---|---|---|
| `overall` | Kondisi bayi hari ini | `usual/different/unsure/not_answered` | optional |
| `feeding_vs_usual` | Menyusu dibanding biasanya | `as_usual/less/difficulty/unsure/not_answered` | optional |
| `wet_diapers_vs_usual` | Popok basah | `as_expected/fewer/unsure/not_answered` | optional |
| `sleep_concern` | Ada kekhawatiran tidur? | `none_reported/yes/unsure/not_answered` | optional |
| `new_symptoms` | Ada gejala baru? | `none_reported/yes/unsure/not_answered` | optional |
| `parent_concern` | Hal yang ingin ditanyakan ke dokter | text ≤2000 | optional |
| `caregiver_wellbeing` | Kondisi pengasuh | optional, private | optional |
| `state` | Status check-in | `draft/completed` | yes as control |

Show contextual follow-up prompt if `different`, `less`, `fewer`, `yes`; allow navigating to Symptoms log. A `completed` check-in may have an unanswered optional item; UI must show "sebagian terisi" instead of asserting normal. Emergency selections invoke immediate guidance, not a soothing 'all okay' summary.

## J. Non-daily modules — intentionally separate
- `growth_measurements`: weight kg / recumbent length cm / head circumference cm, measured_at, setting home/clinic/posyandu, verification status, caregiver/clinician notes. No daily weighing pressure.
- `developmental_observations`: milestone content version, age group, achieved/not_yet/unsure, observed_at.
- `vaccination_records`: vaccine code/name, dose no, administered date, facility, verification, attachment opt-in; don't suggest schedule from guessed history.
- `appointments`: type, date/time, location (optional), questions, follow-up.
- `birth_history`: due date or gestational age, birth weight optional, special care flags; see age correction.

## Summary formulas
- `wet_diaper_events` = count of diaper events with `diaper_kind in (wet,both)` within local-day interval; do **not** count if data missing.
- `dirty_diaper_events` = count `dirty,both`; same caution.
- `sleep_minutes` = sum of the intersection of each non-overlapping sleep interval with queried window; ongoing sleeps use current time marked *provisional*. Distinguish *last 24h* vs *calendar day*.
- `bottle_consumed_ml` = sum known `volume_consumed_ml` only; label as **recorded known volume** and show `n with missing volume`.
- `direct_breast_minutes` = sum known durations; not equivalent to milk intake.
- `feeding_count` = events logged (not number of actual feeds if incomplete log).
- `medications_given` count `status=given` only, partial separately; no adherence percentage if regimen unspecified.
- All metrics must display empty/not logged distinctly from zero recorded.

## Validation and edge cases applicable to all forms
1. Validate `baby_id` membership on server, never accept client-supplied `actor_user_id` as authority.
2. Backdated logs supported (recommended e.g. past 12 months) without forcing impossible plausibility; notify if far outside baby lifespan.
3. Future events > 5 minutes? show edit confirmation; reminders/appointments use their own future-time model.
4. Validate numerical input client and server; preserve user-entered units; convert for normalized storage only with transparent method.
5. Optimistic client-generated UUID; deduplicate on sync with `(baby_id, client_event_id)` unique index.
6. Soft delete with deletion audit and eventual purge; no resurrection on offline retries.
7. Distinguish not-entered `null`, explicit `false`, `unknown`, and `not_observed`.
8. Event date reflects baby's timezone; display actual original timestamp and allow edit; DST boundaries must be safe.
9. Never send attachment or free-text contents to analytics.
10. Every input includes an accessible label and uses appropriately sized numeric/temporal keyboard.
