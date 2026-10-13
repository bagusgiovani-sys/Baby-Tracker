# 05 — Engineering Architecture, Contracts, Offline Sync

## Architecture
```
Expo app (iOS/Android)                 Supabase project
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ Expo Router / RN screens    │        │ Auth (email OTP / OIDC)     │
│ UI forms + Zod              │        │ Postgres + RLS              │
│ Domain repository interfaces│◄──────►│ Secure SQL RPC / Edge funcs│
│ SQLite local read models    │ HTTPS  │ Private object storage      │
│ SQLite durable mutation queue│       │ Audit + expiry jobs         │
│ Timezone-aware aggregations │        │ Reviewed content versions   │
└─────────────────────────────┘        └─────────────────────────────┘
```

Versions: choose Expo-supported stable dependencies and pin with lockfile during Sprint 0. Client has **publishable** Supabase key only; no `service_role` secret. SSR not necessary for MVP.

## Repo layout (target)
```
app/
  (auth)/{welcome,sign-in,consent,onboarding}.tsx
  (app)/(tabs)/{today,history,growth,development,health}.tsx
  (app)/log/{feeding,diaper,sleep,solids,symptom,medication,activity}.tsx
  (app)/{check-in,baby-settings,family-settings,export}.tsx
src/
  components/{forms,charts,feedback,layout}/
  domain/{types,validation,age,events,totals,clinical-content}/
  data/{remote,local,sync}/
  features/{feeding,diaper,sleep,solids,checkin,growth,health,...}/
  lib/{supabase,i18n,theme,auth}/
  hooks/
  tests/
supabase/migrations/
supabase/functions/{invite-caregiver,export-report,delete-baby}/
assets/ (licensed and original only)
docs/ AGENTS.md README.md .env.example
```

## Separation of concerns
- **UI:** collect/edit/display only, no raw SQL or clinical inference.
- **Domain:** pure, deterministic validation and nonclinical arithmetic (interval math, summary totals, unit conversions when explicit).
- **Repositories:** typed CRUD operations, mutation queue, access to local encrypted/secure state.
- **Backend:** membership enforcement, payload validation, audit, atomic typed-record persistence.
- **Clinical module:** read-only, versioned, signed-off reference data; outputs include `source`, `version`, `calculation_method`, `verified_status`.

## Example application service contracts (TypeScript pseudocode)
```ts
type SyncStatus = 'local_only' | 'queued' | 'syncing' | 'synced' | 'error' | 'conflict';
type EventType = 'feeding' | 'diaper' | 'sleep' | 'solid_meal' | 'medication' | 'symptom' | 'activity';
type ClientMutation = {
  clientMutationId: string;  // UUID idempotency key per mutation
  eventId: string;            // UUID stable across devices once synced
  babyId: string;
  operation: 'create' | 'update' | 'delete';
  expectedServerVersion?: number;
  eventType: EventType;
  payload: unknown;          // Zod-discriminated union validated before use
  queuedAtUtc: string;
};
type MutationResult =
  | { ok: true; eventId: string; serverVersion: number; serverUpdatedAtUtc: string }
  | { ok: false; kind: 'conflict'; serverVersion: number; current: unknown }
  | { ok: false; kind: 'unauthorized' | 'validation' | 'retryable'; message: string };
```

## API/RPC contracts
Use a small set of verified backend operations, returning shaped JSON:
1. `create_baby(input)` => baby + owner membership in one transaction after consent; user principal derived from auth.
2. `save_care_event(input, expected_version?)` => event + typed detail transaction, idempotency via clientMutationId; server-side Zod equivalent or SQL validation.
3. `delete_care_event({eventId, expectedVersion})` => tombstone + audit.
4. `list_events({babyId, fromUtc, toUtc, cursor, kinds})` => paged authorized events.
5. `upsert_daily_checkin({babyId, localDay, fields, expectedVersion})` => check-in; unique local day; conflict on concurrent changes.
6. `list_growth_records` + `save_growth_record` => authorized history; medical calculation separate.
7. `list_milestone_catalog({locale, version})` + `upsert_milestone_observation` => reviewed content only.
8. `send_invitation` / `accept_invitation` / `revoke_membership` => Edge Functions with verified tokens, role checks, expiry and auditing.
9. `generate_export({babyId, filters})` => backend-created PDF/CSV in private storage, expiring access, audit entry. Reject broad export if not authorized.
10. `request_baby_deletion` => owner reauth, revoke membership, encryption-safe deletion/purge workflow, audit and user confirmation.

Every server operation must enforce auth, baby membership, field/size limits, rate limits and signed/traceable request ID. Never use unsafe generic `table`, `where` or `update any column` APIs exposed to the client.

## Local persistence, sync and collision semantics
**Local first:** on save validate -> commit to SQLite transaction (event read model + queued mutation) -> show immediately with `Queued` badge -> network worker sends mutation to backend when authenticated/reachable -> accept server version -> status `Synced`.

**Sync lifecycle**
1. User creates `client_event_id` and `clientMutationId` UUIDs. These are durable, not recreated on retries.
2. SQLite persists event + mutation atomically. Crash/restart safe.
3. Worker runs on foreground/resume/network restoration. Limited exponential retry with jitter and bounded batch size.
4. Server checks `(baby_id, client_event_id)` and `clientMutationId` uniqueness; duplicate resend returns existing accepted result.
5. Success: update local `server_version`, authoritative fields and `synced` state.
6. Transient error: keep local write, show `Menunggu sinkronisasi`/retry option.
7. Unauthorized/revoked: stop syncing, freeze local app view and purge cache at appropriate secure logout stage. Do not replay data under another account.
8. Conflict: return 409-like domain response, show side-by-side values when possible; no silent last-write-wins on medical fields.
9. Delete: tombstone with mutation timestamp/version; do not let older delayed create undo deletion.
10. Pull changes via cursor + server updated timestamp, partitioned by baby. RLS filters all results. Push first or pull first depending on conflict; test both.

**Real-time:** Supabase Realtime for visible updates can be added after durable polling sync; not a replacement for local queue or conflict handling.

## Aggregation correctness
`dayRange(babyTimezone, YYYY-MM-DD)` yields local start and next midnight, converted independently to UTC, not hardcoded 24h. Day could be 23/25 hours due to DST internationally. Use half-open intervals `[start, end)`. Sleep events spanning boundary are clipped into each day's range, and overlapping duplicate sessions are detected or deduplicated before totals (do not double count). Rolling 24h = `[now-24h, now)` explicitly labeled as such. An active timer uses now only as provisional endpoint and is never stored as final until stopped.

Summaries must use saved local events with sync badges, and clearly say `berdasarkan data yang dicatat`. Show null instead of zero where appropriate.

## Auth and navigation behavior
- Auth tokens in platform-secure storage, never AsyncStorage plaintext for sensitive secrets.
- SQLite may include health data, so apply secure device storage / encryption strategy; validate Expo/SQLite-at-rest feasibility and document threat model before public beta.
- Expo deep links with allowlisted redirects and verified session handling.
- App lock / biometric gate later, not a substitute for OS-level secure storage.
- Session expiration should not erase unsynced logs automatically; protect them from the next account and offer secure re-auth recovery.

## Deployment environments
`local`, `staging`, `production` Supabase projects separated; test data synthetic; migrations CI-controlled; production schema changes reviewed; minimal environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Server secrets only in Supabase function secrets. No production data to local logs.

## Observability
Structured operation names, durations, counts and non-sensitive error codes. Redact child names, caregiver names, emails, personal notes, medication/temperature values, birth dates, access tokens, attachment URLs. Never log raw payloads. Security alerts from unusual auth/invite/export access should be reviewed.
