# Errors, fixes and unresolved issues

Last updated: 2026-10-14.

This is the ongoing issue log. Record meaningful bugs, setup corrections and unresolved blockers here. A fix in source is not automatically a verified device or production fix. Initial entries below were reconstructed from this development session and its tests; no production incidents have been observed.

Do not include credentials, infant records, caregiver emails, free-text notes or sensitive screenshots. Refer to synthetic examples, bounded error codes and files instead.

## Fixed and tested in the available environment

| ID | Problem and cause | Correction | Evidence and limits |
| --- | --- | --- | --- |
| FIX-001 | Empty or malformed Supabase URLs caused `new URL()` inside a Zod refinement to throw instead of returning a validation failure. | Catch parsing errors in [env.ts](../src/lib/env.ts) and return false. | Malformed/empty URL regression cases pass in [env.test.ts](../tests/env.test.ts). Five synthetic deployment-setting cases also passed. No remote connection verified by these checks. |
| FIX-002 | A lost acknowledgement followed by another caregiver's edit could use the latest server version to rebase a later queued edit silently. | Track the mutation receipt's originally accepted version separately from the current event version; preserve explicit conflicts. | Lost-ACK/queued-edit and deletion-conflict cases pass in [queue.test.ts](../tests/queue.test.ts). Receipt replay behavior passes in [database.test.mjs](../tests/database.test.mjs). Actual concurrent network sessions remain unverified. |
| FIX-003 | A form open during a newer server pull could save with the newer version and conceal that its input was stale. | Capture the form's baseline version and retain it in the queued update. | Stale-form version case passes in [queue.test.ts](../tests/queue.test.ts). Interactive form flow still needs browser testing. |
| FIX-004 | Retrying a repaired, definitively rejected mutation with its original ID could collide with its previous receipt/fingerprint. | Use a new mutation ID for a repaired definitive rejection; retain the ID after ambiguous network failure. | Rejected-create repair and transient retry cases pass in [queue.test.ts](../tests/queue.test.ts). |
| FIX-005 | Duplicate acknowledgements and older pulls could overwrite newer local/server version state. | Ignore acknowledgements already removed from the queue and reject version regressions while retaining pending edits. | Duplicate-ACK and stale-pull cases pass in [queue.test.ts](../tests/queue.test.ts). |
| FIX-006 | Existing Supabase default grants could leave direct writes or private helper execution available despite intended API boundaries. | Explicitly revoke default client privileges before granting only intended reads/RPCs; restrict the private event JSON helper. | Embedded PostgreSQL tests simulate permissive defaults and verify denied writes/helper access in [database.test.mjs](../tests/database.test.mjs). Real project grant checks remain pending. |
| FIX-007 | Native encrypted transactions risked using a different, unkeyed connection; overlapping asynchronous transactions could also interfere. | Use one keyed connection and serialize transaction work in [sqlite-driver.ts](../src/data/local/sqlite-driver.ts). | Real SQLite serialization and rollback cases pass in [storage.test.ts](../tests/storage.test.ts). Native SQLCipher integration still requires a development build/device check. |

## Setup and documentation corrections

| ID | Observation | Correction | Status |
| --- | --- | --- | --- |
| SETUP-001 | The supplied publishable-key value was initially another copy of the Project URL. | Explained the distinction; saved the subsequently supplied publishable key and project URL in ignored local configuration. | Local environment-schema and deployment-setting validation passed on 2026-10-14. This does not establish network access or live authentication. Vercel environment variables still need to be configured. |
| SETUP-002 | Instructions assumed hosted email templates could be edited immediately. The user's dashboard requires Custom SMTP before editing them. | Updated [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to describe the prerequisite and the default magic-link route for initial team-account testing. Changed bilingual sign-in copy to cover a code or link and explain opening links in the requesting browser. | Translation parity check passed. Email delivery/callback testing remains pending deployment. Numeric OTP requires a token-bearing email template. |
| SETUP-003 | The setup guide and implementation status needed to distinguish local tests from real Supabase setup. | Record evidence by source: the user reported both SQL Editor scripts succeeded; automated tests ran against embedded PostgreSQL. | Live schema, permissions and authentication have not been independently inspected from this workspace. |

## Open blockers and limitations

| ID | Issue | Current evidence | Next action |
| --- | --- | --- | --- |
| OPEN-001 | Full dependency installation and app validation are unavailable. | Latest recorded registry request failed with `ECONNREFUSED` through the environment proxy; Expo and full lint/UI tooling are unavailable. | Restore registry access; install dependencies and generate the lockfile; run format, lint, full TypeScript, UI tests, export and audit. |
| OPEN-002 | Vercel publication is incomplete. | No confirmed Vercel account connection, linked project or successful deployment URL. Supabase settings exist locally only. | Connect Vercel, select/create the project, set public backend variables and run the guarded deployment build. Fix any build errors before handover. |
| OPEN-003 | Real authentication and browser/device persistence are unverified. | Callback and native/web storage source exists; tests cover core contracts, not real Supabase Auth, browser APIs or native keystores. | Test real email login, redirects, account switching, restarts, offline edits, reconnects and revocation on the deployed app. |
| OPEN-004 | Cold offline browser launch is unsupported. | No service worker or offline app-shell cache is implemented. A loaded tab can queue events locally. | Keep this limitation explicit; add and validate an app-shell caching design if required in a later slice. |

## Entry format for future work

For each new issue, record an ID, date, observed symptom, cause if established, affected files, fix or next action, and actual verification result. Mark source-only fixes as awaiting runtime verification. Update or close existing entries when new evidence arrives rather than duplicating them. Never mark a blocker resolved solely because a workaround was proposed.

Related documents: [implementation status](IMPLEMENTATION_STATUS.md), [decisions](DECISIONS.md), [Supabase setup](SUPABASE_SETUP.md), and [Vercel deployment](VERCEL_DEPLOYMENT.md).
