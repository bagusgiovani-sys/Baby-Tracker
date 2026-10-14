# Implementation decisions: Sprint 0 and Sprint 1

These decisions supplement the original product specifications. This delivery stops at Sprint 1 as directed by CODEX_START_HERE.md. Runtime acceptance remains pending; see IMPLEMENTATION_STATUS.md.

## Platform and scope

- The production web host is https://babybloom-omega.vercel.app in a new babybloom project under the user's personal Hobby workspace. Vercel publication uses Node 22.x and the guarded build. Source uploads start from the outer repository because the cloud app Root Directory is Baby_Bloom_App; its root upload exclusions must retain the application lockfile and exclude local credentials/caches. Production public backend settings are configured; preview settings and Supabase Auth redirect changes are not assumed. HTTP hosting verification does not establish interactive authentication or browser persistence.

- The outer Baby_Tracker checkout is the Git repository root. CI lives in its .github/workflows directory and runs in Baby_Bloom_App using lockfile-based installation. CI exports use synthetic public backend settings and do not verify real authentication. Audit scripts explicitly enable online mode; existing high findings stay visible and fail the audit gate.

- Make essential JSX, modern library, bundler module resolution and no-emit settings explicit while retaining Expo's base configuration. This keeps useful compiler settings when installation is incomplete; it does not substitute for dependency declarations. Use the installed workspace TypeScript in the editor. Do not silence missing-module errors with ambient any declarations or disable strict mode.

- Follow-up user direction prioritizes Vercel deployment of the responsive web app before native distribution. Supabase remains the account and data backend. Vercel configuration uses SPA fallback and isolation headers; public backend settings are required at build time. This changes delivery order, not the Sprint 1 feature boundary.

- Use Expo Router, React Native and strict TypeScript for one mobile-first Android, iOS and responsive web codebase. Shared layouts adapt to phone, tablet and desktop widths. Actual viewport and device verification is still required.
- Use a small React context store as the permitted equivalent to React Query. SQLite is the durable local read model and mutation queue; Supabase is the authoritative shared backend.
- Indonesian is the initial language. English and 12/24-hour preferences are available. Growth, Development and Health tabs identify deferred functionality; they do not display invented measurements or recommendations.
- Email OTP supports code entry and a callback route. First sign-in, account creation and baby creation require a connection. Sharing/invitation redemption, clinical modules, exports and account deletion are later-sprint work.
- SDK 57 versions were selected using Expo's SDK release and bundled-native-module sources. They are pinned, but an installed dependency tree, generated lockfile and full compatibility check are still required. Do not treat the package manifest as an audited release.

## Records, units and time

- Event and client-event identity use the same UUID. Each attempted logical mutation has a separate UUID. Normalized Postgres detail tables are authoritative; JSON in SQLite is a local read model, not the backend schema.
- Missing values remain null. Zero is a recorded observation. Feeding duration never becomes an inferred milk volume. Bottle totals sum known consumed mL and separately identify missing quantities.
- Offered volume follows the dictionary's limit below 2,000 mL. Consumed volume is nonnegative with one decimal place and the numeric(6,1) storage ceiling of 99,999.9; that ceiling is not clinical guidance. Consumed and offered are independent observations.
- Gestational age is optional; weeks 1-45 and days 0-6 are structural input bounds, not a clinical interpretation. No corrected-age or growth percentile calculations are enabled.
- Instants are stored in UTC. Baby IANA time zone determines daily boundaries and wall-clock input. DST gaps are rejected; repeated times require choosing the earlier or later instant. Local-day totals use consecutive local midnights, allowing 23/25-hour days.
- Timestamps over five minutes in the future require explicit confirmation. Pre-birth timestamps receive a warning. Device time is not an authoritative clinical clock.
- Sleep intervals are clipped to the selected window and overlapping intervals counted once. An active sleep interval contributes provisional duration. Only one active sleep is allowed per baby; no physiological sleep targets are inferred.

## Offline synchronization and conflicts

- A local transaction writes both the event and its queued mutation. Restart resets interrupted syncing work. Retries retain the mutation ID after ambiguous network failure and use backoff; definitively rejected edits can be repaired with a new mutation ID.
- Server functions authorize each write, serialize writes within a baby, and compare expected versions. Mutation receipts record the originally accepted version. A lost acknowledgement followed by another caregiver's edit cannot silently rebase a pending edit.
- Conflict UI presents local and server values and requires a choice. Deletions are versioned tombstones; choosing local data cannot resurrect a server-deleted record. Audit entries preserve actor attribution without duplicating free text.
- Delta reads use timestamp plus ID pagination, overlap the previous cursor by one second, and merge by server version. Unsent local edits are retained. Queues and cursors are account-scoped.
- Confirmed membership removal purges that baby's local data. Network failure does not prove revocation. An offline client cannot discover a server-side access removal until it reconnects.
- Web supports logging while an already loaded app is offline and persists records across reloads. A service worker/offline app-shell cache is not implemented; a completely cold browser launch without connectivity is not an accepted capability yet.

## Security and storage assumptions

- Table grants, RLS and security-definer RPC checks work together. Clients cannot directly write protected tables or read mutation receipts. The service-role key is never part of client configuration. Invitation tables are present but server-managed; there is no invitation-sending flow yet.
- Native SQLite requires SQLCipher in a custom development/release build. A random key is stored in SecureStore. All statements in a transaction use the same keyed connection. Expo Go does not satisfy this storage requirement.
- Web SQLite payloads use AES-256-GCM with fresh nonces. Nonextractable keys and encrypted auth sessions are persisted in IndexedDB. Web Locks coordinate database operations across tabs; cross-origin isolation is required for SQLite WASM.
- Browser encryption protects stored payload bytes, not a compromised same-origin script, unlocked device, browser profile or malicious extension. Index metadata (including scoped identifiers) is not encrypted. No hardware-backed web keystore or device-lock guarantee is claimed. Clearing browser data can permanently remove unsynchronized records.
- Native auth session chunks live in SecureStore. Signing out clears visible account state; unsynchronized account-scoped records remain locally available for that account's later sign-in. A production retention/deletion policy and device access review are still required.
- No telemetry or medical/photo uploads are enabled. Validation and synchronization errors use bounded codes rather than copying sensitive payloads into logs.

## Clinical and legal review

- Consent records use a draft policy version. Privacy copy needs legal review before real-user release.
- The safety screen provides general emergency signposting and a link to AAP safe-sleep education. It does not claim that local educational copy has received clinical review.
- Clinical rules, symptoms, temperature alerts, photos, vaccination rules, growth calculations and developmental interpretations remain disabled with REQUIRES_REVIEW status. The fever workflow belongs to the symptom phase and is not represented as implemented in Sprint 1.
- No conclusion about health is drawn from missing logs. A clinician-reviewed safe-sleep page and all acceptance checks remain release gates.
