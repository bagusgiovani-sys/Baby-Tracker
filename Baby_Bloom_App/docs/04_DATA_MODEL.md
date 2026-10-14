# 04 — Relational Data Model / Schema and Integrity

## Principles
Use Postgres typed tables + strong FKs + constraints; time-based baby-specific `care_events` as a common envelope; typed event detail tables. UUID PKs, ISO UTC timestamps (`timestamptz`), `created_at`, `updated_at`, `deleted_at` where appropriate. Never use `actor_id` from client as authority: Postgres session `auth.uid()` for authenticated writes. Client-generated `client_event_id` gives idempotent offline replay.

## Entity relationship overview
```
auth.users ──1:1── profiles
     │
     └──N── baby_memberships ──N── babies ──1:N── care_events
                         │                   ├── feeding_details
                         │                   ├── diaper_details
                         │                   ├── sleep_details
                         │                   ├── solid_meal_details
                         │                   ├── symptom_details (+ symptom codes)
                         │                   ├── medication_details
                         │                   └── activity_details
                         └── (through babies): daily_checkins, growth_measurements,
                              milestone_observations, vaccinations, appointments
profiles ──1:N── maternal_meals [private per author]
babies ──1:N── baby_invitations [server-managed]
```

## Core tables
### `profiles`
`user_id uuid PK REFERENCES auth.users(id)`, `display_name text null`, `locale text default 'id-ID' CHECK in ('id-ID','en')`, `created_at`, `updated_at`. Avoid storing unnecessary addresses.

### `babies`
`id uuid PK`, `nickname text NOT NULL`, `date_of_birth date NOT NULL`, `gestation_weeks smallint NULL`, `gestation_days smallint NULL`, `estimated_due_date date NULL`, `growth_reference_sex text NULL CHECK IN ('female','male')`, `timezone text NOT NULL` validated to IANA timezone in app/server, `solids_started_on date NULL`, `created_by uuid FK users`, `created_at`, `updated_at`, `deleted_at NULL`.
- `gestation_weeks` plausible range reviewed by clinicians; don't assume term where blank.
- `growth_reference_sex` is for growth standards only; if unknown, raw measurements still allowed, charts requiring it not computed.

### `baby_memberships`
`baby_id uuid FK`, `user_id uuid FK`, `role text CHECK IN ('owner','editor','viewer')`, `status text CHECK IN ('active','revoked')`, `created_at`, `revoked_at`, `PRIMARY KEY(baby_id,user_id)`.
- Invariant: active baby has ≥1 owner; only owner can invite/revoke/share/delete.
- Direct mutations to memberships forbidden to normal clients; use security-definer function or edge function with strict server-side checks and auditing.

### `baby_invitations`
`id`, `baby_id`, `inviter_id`, `invitee_email_hash` or other privacy-safe invite lookup, `role`, `token_digest`, `expires_at`, `accepted_at`, `revoked_at`, `created_at`. Never store token plaintext. Only owner via verified function.

### `care_events` (one row per recorded activity)
`id uuid PK`, `client_event_id uuid NOT NULL`, `baby_id uuid FK NOT NULL`, `event_type enum NOT NULL` (`feeding`,`diaper`,`sleep`,`solid_meal`,`medication`,`symptom`,`activity`), `occurred_at timestamptz NOT NULL`, `ended_at timestamptz NULL`, `recorded_by uuid FK NOT NULL DEFAULT auth.uid()`, `created_at`, `updated_at`, `deleted_at`, `server_version bigint NOT NULL DEFAULT 1`, `note text NULL`, `UNIQUE(baby_id, client_event_id)`.
- Typed details must exist for corresponding event type on successful commit; server writes via atomic RPC or edge action, not partially visible two-step writes.
- Tombstone deletions preserve audit and stop offline resurrections.
- Concurrent edits: require `expected_server_version`, return conflict with current server row.

### `feeding_details`
`event_id uuid PK FK care_events`, `feeding_kind enum NOT NULL`, `breast_side nullable enum`, `volume_offered_ml numeric(6,1) NULL`, `volume_consumed_ml numeric(6,1) NULL`, `CHECK(volume_offered_ml >=0)`, `CHECK(volume_consumed_ml >=0)`, `CHECK(consumed <= offered WHERE both non-null)`; if direct breast, prohibit consumed volume (never invent it); `ended_at` stored on event.

### `diaper_details`
`event_id PK`, `diaper_kind enum NOT NULL`, `stool_color`, `stool_consistency`, `stool_amount`, `blood_seen`, `mucus_seen`, `urine_unusual`, `rash_present`, with NULL for unanswered. For `wet` only, stool fields are null unless `both/dirty`.

### `sleep_details`
`event_id PK`, `sleep_kind enum NULL`, `interruptions_count smallint NULL`, `CHECK >= 0`. `ended_at` is event-level; enforce `end >= start`. Partial unique index on active, non-deleted sleep: `UNIQUE (baby_id) WHERE event_type='sleep' AND ended_at IS NULL AND deleted_at IS NULL` (in core `care_events`).

### `solid_meal_details`, `solid_meal_ingredients`
`event_id PK`, `meal_name`, `texture`, `portion_offered_value numeric NULL`, `portion_offered_unit`, `portion_consumed_value`, `portion_consumed_unit`, `new_food tri-state`, `reaction_notes`, and typed join table for ingredient strings/tags. Allow counts/estimated servings with explicit `approximate` marker.

### `medication_details`
`event_id PK`, `substance_name`, `category`, `dose_value numeric NULL`, `dose_unit text NULL`, `status`, `prescriber_note`. CHECK given => both dose/unit present; missed => optional planned dose but never count given.

### `symptom_details`, `event_symptoms`
`event_id PK`, `description`, `temperature_c numeric NULL`, `temperature_site text NULL`, `severity_self_report text NULL`, `skin_color_observation text NULL`, `related_meal_event_id FK NULL`; `event_symptoms(event_id,symptom_code)` composite PK. CHECK temperature_c null iff site null (if site unknown can use enum `unknown`); sensitive notes private.

### `activity_details`, `event_activity_types`
`event_id PK`, `mood NULL`, `duration_seconds NULL`, `observations NULL`; join for zero or more activity types; at least one of mood/activity required.

## Separate longitudinal tables
### `daily_checkins`
`id`, `baby_id`, `local_day date`, `timezone_at_entry text`, `state draft/completed`, nullable coded observation fields, `parent_concern`, `recorded_by`, timestamps and version, UNIQUE(baby_id,local_day). A uniqueness constraint prevents duplicate daily completed entries; log edits auditably. Lock/check version for concurrent caregivers.

### `maternal_meals`
`id`, `author_user_id uuid`, `linked_baby_id uuid NULL`, `occurred_at`, `meal_name`, `meal_type`, `ingredients`, `notes`, `visibility enum ('private','shared') DEFAULT 'private'`, timestamps. RLS defaults **author-only** even if linked to baby's membership; explicit owner of the record must choose share. Exclude from general baby exports unless opted in.

### `growth_measurements`
`id`, `baby_id`, `measured_at timestamptz`, `measurement_kind weight/recumbent_length/head_circumference`, `value_normalized numeric`, `unit kg/cm`, `source home/posyandu/puskesmas/clinic/other`, `verified_by_clinician bool DEFAULT false`, `notes`, `reference_age_basis chronological/corrected/not_applicable`, `created_by`, timestamps, `deleted_at`. Clinician verification must be restricted to verified provider role later; parent cannot assert clinician-verified by toggling a UI checkbox. MVP label `reported_at_clinic` source, not verified.

### `milestone_content` + `milestone_observations`
Content: `content_id`, `version`, `locale`, `age_months`, `domain`, `text`, `source_url`, `reviewed_at`, `license_note`, `enabled`; observation: `baby_id`, `content_id`, `content_version`, `status achieved/not_yet/unsure`, `observed_at`, `recorded_by` and audit.

### `vaccination_records` + `schedule_versions`
Record: `baby_id`, `vaccine_code`, `vaccine_label`, `dose_number`, `administered_on date`, `clinic_name optional`, `source caregiver_entered/clinic_documented`, `notes`, `recorded_by`. Schedule tables include region, version, source, effective date, independent sign-off; disabled until clinician-approved.

### `appointments`
`baby_id`, `scheduled_at`, `category`, `provider_name`, `notes`, `status`, `created_by`; appointments are **not** medical assessments.

### `audit_events`
`id`, `actor_id`, `baby_id nullable`, `resource_type`, `resource_id`, `action`, `at`, `change_summary_safe jsonb`, `request_id`, `ip_hash maybe`; do NOT place sensitive free text or photo URLs into audit payload; user-accessible access/export/revocation events.

### `guardian_consents`
`user_id`, `baby_id`, `policy_version`, `purpose_code`, `consented_at`, `revoked_at`, `method`, with source of guardian authority confirmation and clear limitations.

### `attachment_metadata` (feature-flagged)
`id`, `baby_id`, `owner_id`, `event_id`, `storage_key`, `media_type`, `bytes`, `retention`, `created_at`; private buckets; authenticated signed URLs for brief periods; encryption at rest.

## RLS policy model (deny by default)
- On all baby-bound tables: `SELECT` when `EXISTS(active membership for auth.uid())`; `INSERT`/`UPDATE`/`DELETE` only `role IN ('owner','editor')`; viewers select only.
- `recorded_by` always current authenticated user; never trust client-supplied impersonation.
- `baby_memberships`: viewer can see own membership; owner may list baby membership; only audited server function changes roles.
- `babies`: owner creates & updates, viewer/editor can select, owner deletes via server workflow.
- `maternal_meals`: author only by default; `shared` read only by explicitly authorized family, and never wider.
- `audit_events`: append only trusted server; access filtered by authorized membership; actor cannot modify logs.
- Every new table gets SQL unit tests: no-membership denied, viewer write denied, editor delete baby denied, revoked denied, owner allowed, cross-family joins cannot leak.

## Migration implementation order
1. `profiles`, `babies`, `memberships`, consent and base RLS, owner creation RPC.
2. `care_events`, typed feed/diaper/sleep + insert/update RPCs + audit.
3. Check-in, MPASI, medication, activity and symptom typed tables.
4. Growth, development, vaccines, appointments.
5. Invitations, private maternal meals, exports, retention jobs and optional storage.

## Security note
SQL migrations need actual executable `CREATE POLICY`, indexes, safe `search_path` on security-definer functions and tests. This document is a logical schema specification, **not** a claim that secure migrations already exist.
