# Sprint 0/1 implementation status

Updated 2026-10-14 after dependency installation and full source checks. Application root: Baby_Bloom_App. The user renamed the original application folder; do not run npm commands from the outer Baby_Tracker directory.

Sprint 0/1 source, installed app types, formatting, lint, core/database/component tests and web export are verified. BabyBloom is now deployed at https://babybloom-omega.vercel.app and its hosting HTTP checks pass. The complete release/acceptance definition of done remains open: dependency security findings, real Supabase authentication, browser/device behavior, and clinical/privacy review still require attention.

## Actual results

| Check | Result |
| --- | --- |
| Dependency installation | User installed 1,103 packages; app package-lock.json now exists. |
| npm run doctor | Passed with pinned dependencies and Expo base configuration present. |
| npm run check | Passed end to end after corrections. |
| Prettier formatting check | Passed. Source is now formatted with Prettier. |
| ESLint | Passed, with no lint errors or warnings. |
| Full application TypeScript | Passed with the installed Expo/React/native declarations. |
| Domain/environment/storage/queue tests | 27 passed, 0 failed. |
| Embedded PostgreSQL tests | 13 passed, 0 failed: 12 nested cases plus the enclosing integration test. |
| React Native component tests | 4 passed, 0 failed; includes explicit delete confirmation, disabled save, nullable choices, and timestamp partial-input/external-reset behavior. |
| Guarded Vercel build | Passed: validates public backend configuration, typechecks and exports dist, including SQLite WASM and its worker. |
| Expo package compatibility | Offline installed-SDK check reports dependencies up to date; Expo warns that offline validation is less reliable. Network-enabled check remains recommended. |
| Live npm audit | Approved online audits completed: 64 overall (15 moderate, 49 high), 60 omit-dev (15 moderate, 45 high), zero critical. Remediation remains open. |
| Browser verification | Could not start: browser tool sandbox metadata lacks sandboxPolicy. No browser screenshots or runtime QA completed. |

Tests use synthetic data. The PostgreSQL harness uses real embedded PostgreSQL roles/policies and simulated Supabase auth context; it is not a live Auth/PostgREST/network integration test. Native SQLCipher and real-browser IndexedDB/Web Locks still need runtime verification. Node prints module-type inference and experimental SQLite warnings during passing tests.

## Corrections during installed checks

- Fixed six lint failures involving synchronous effect state updates and render-time clock access without disabling the rules. Invalid callback/configuration state is derived directly; timestamp editing retains incomplete text and handles external resets; initial sync is asynchronous with cancellation; future-time UI uses a timer-backed clock.
- Replaced removed testing-library matchers with supported selected/disabled assertions. Disabled-button interaction uses userEvent rather than a legacy fireEvent path that throws while walking a null host parent.
- Deployment preflight loads an optional local .env. Cloud environment values retain precedence, and .env is excluded from Git and Vercel upload.
- Kept strict typing and actual package declarations. No fake native declarations or relaxed safety checks were introduced.
- Expo export initially tried to write outside the sandbox. For this agent's successful build, telemetry was disabled and Expo's settings location redirected into the ignored workspace .expo-home. Normal user terminals do not need this sandbox-specific setup.

See ERRORS_AND_FIXES.md for individual fixes and DEPENDENCY_REVIEW.md for current security evidence.

## Implemented behavior

Expo Router provides mobile-first responsive auth, Today/history and feeding/diaper/sleep entry flows. Indonesian and English are supported. Profiles include explicit guardian consent and baby time zones. Records support nullable observations, timers, UTC/local-day handling, edit/delete and explicit version conflicts. Native/web storage adapters persist a durable account-scoped mutation queue. Supabase migrations provide normalized detail tables, RLS, restricted RPC writes, audited attribution, idempotency receipts and tombstones.

Growth, developmental interpretation, symptoms/temperature workflows, daily check-in entry, sharing, exports and account deletion remain later-sprint work. Clinical rules remain disabled pending review. A loaded browser tab supports offline entry; cold offline launch has no app-shell cache yet.

## Backend and deployment state

Latest deployment evidence: the new babybloom Vercel project is linked in the user's personal Hobby workspace. Production public backend settings, Node 22.x, app Root Directory, npm ci and the guarded build are configured. The production deployment reached READY. Anonymous HTTP checks passed for the root/sign-in/callback app shells, required headers, configured JavaScript, SQLite WASM and the worker referenced by the remote bundle. Supabase's public auth settings return HTTP 200 with email enabled. Interactive sign-in, browser storage and account isolation remain unverified. Set Supabase Site URL to https://babybloom-omega.vercel.app and allow https://babybloom-omega.vercel.app/auth/callback; this agent has not modified Supabase Auth configuration.

The user reported both SQL Editor migrations succeeded. Supabase URL and publishable key are saved in ignored local configuration and pass structural validation. The live schema, grants and authentication have not been independently inspected here. Default email templates may require using a magic link for team-account testing; numeric OTP requires a token-bearing template and the hosted dashboard requires SMTP before editing templates.

CI lives in the outer repository's .github/workflows directory and runs in Baby_Bloom_App using its lockfile, synthetic CI backend settings and explicit online audits. YAML/path validation and local checks/build passed; GitHub execution is pending and the audit gate will fail on existing high findings. Vercel and Supabase plugins remain unconnected; Vercel CLI authentication and publication succeeded instead. The local app rename and edits have not been committed or pushed by this agent. Preview backend settings remain unconfigured.

Follow-up verification: npm run check passed again (27 core, 13 embedded PostgreSQL results, 4 UI cases). Local and remote guarded builds passed. Both checked bundles contain the configured public backend values and no synthetic CI origin. Browser connection still failed before navigation due to missing sandboxPolicy metadata; live verification used HTTP and did not render the app.

Deployment follow-up: Vercel CLI 64.0.2 is cached locally and authenticated using a separate temporary global configuration directory outside the repository. The cloud project has the correct app directory and production backend settings. Repository-root upload exclusions were verified before publication. The application lockfile is unchanged. Remote npm ci warned about an optional react-native-worklets peer mismatch; this did not prevent web build success and native compatibility still needs validation.

Next: configure Supabase Auth URLs, test real email sign-in and synthetic logging on phone/browser, and resolve compatible dependency remediation. Sprint 1 runtime/security/accessibility acceptance remains open before Sprint 2.
