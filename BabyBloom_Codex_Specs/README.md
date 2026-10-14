# BabyBloom

Mobile-first infant activity tracker built with Expo Router, React Native, TypeScript, SQLite and Supabase. Indonesian is the default language; English is included. The same codebase targets Android, iOS, tablet and responsive web.

Sprint 0/1 source is implemented: email OTP, consent and baby onboarding, Today summaries, feeding/diaper/sleep forms, timers, history, editing/deletion, durable offline mutations and explicit conflict resolution. **This is not a verified release build.** Full installation and device/browser checks are blocked in the current environment. See [implementation status](docs/IMPLEMENTATION_STATUS.md).

The original [build-pack README](docs/BUILD_PACK_README.md), [field dictionary](docs/02_DAILY_DATA_DICTIONARY.md), [backlog](docs/09_IMPLEMENTATION_BACKLOG.md) and [agent instructions](AGENTS.md) remain requirements. Implementation assumptions are recorded in [DECISIONS.md](docs/DECISIONS.md).

## Development setup

**Web deployment priority:** see [Vercel setup and deployment](docs/VERCEL_DEPLOYMENT.md). Hosting routes, database isolation headers and build-time Supabase configuration checks are supplied in `vercel.json`.

For first-time backend setup, follow [Supabase setup step by step](docs/SUPABASE_SETUP.md).

Known errors, fixes, validation evidence and unresolved blockers are tracked in [ERRORS_AND_FIXES.md](docs/ERRORS_AND_FIXES.md).

Use Node 22.15 or newer. Run these commands from this folder, beside package.json:

```powershell
Copy-Item .env.example .env
npm install
npm run format
npm run check
```

Installation requires registry access. No lockfile could be generated here because Expo packages are not cached and package downloads are blocked. Generate and commit package-lock.json after a successful install; use `npm ci` thereafter. The source was syntax-formatted with TypeScript's printer, but Prettier verification remains pending. Run `npx expo install --check` and review any SDK compatibility findings before building.

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` to the selected project's URL and publishable/anon key. Never place a secret/service-role key in an EXPO_PUBLIC variable. No cloud project has been provisioned or modified.

## Local Supabase and email sign-in

With Docker and the Supabase CLI installed:

```powershell
supabase start
supabase db reset
```

Reset only a disposable local database: it deletes existing local data. Copy its public connection values into `.env`. See [migration and seed instructions](docs/MIGRATIONS.md). For Android emulator use `http://10.0.2.2:54321`; for a physical device use the reachable development machine LAN address and appropriate local networking configuration.

The sign-in screen accepts an email OTP. Configure the Supabase email template to include `{{ .Token }}` for code entry. Native callback is `babybloom://auth/callback`; web callbacks are the exact deployed origin plus `/auth/callback`. Local configuration includes localhost and 127.0.0.1 on port 8081. Register actual production origins in Supabase Auth; do not use broad production redirect wildcards. Read local email in Mailpit, using the address printed by `supabase start`.

Hosted Supabase's default mail sender is limited to authorized project-team addresses and a low sending quota; configure custom SMTP for other beta users. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp). Verify email delivery, expiry, resend limits and both callback/code flows against the configured project.

## Run on mobile and web

```powershell
npm run android
# On macOS with Xcode:
npm run ios
# With an installed native development build:
npm start
# Browser:
npm run web
```

Native storage uses SQLCipher, with its key in SecureStore. A custom native development build is required; Expo Go cannot provide the configured SQLCipher module. Android/iOS build tools must be installed separately.

Web SQLite uses WASM and requires a secure context, Web Locks and cross-origin isolation. Metro sets the required development headers. Production hosting must serve `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; `public/_headers` supplies a template for hosts that support that file. Configure SPA route fallback to index.html, including `/auth/callback`, and serve WASM with the correct MIME type. HTTPS is required outside localhost.

```powershell
npm run build:web
```

The export is written to `dist`. Test phone, tablet and desktop viewports, storage persistence, keyboard/focus, sign-in callbacks and deep links on the actual host. A loaded browser app supports offline event entry; a service worker for cold offline launch is not implemented. Browser payload encryption does not protect against compromised same-origin JavaScript. See [storage assumptions](docs/DECISIONS.md).

## Validation

```powershell
npm run check        # Prettier, ESLint, full TS, domain/storage/queue, PostgreSQL, UI
npm run build:web
npm audit --audit-level=high
```

`npm test` runs domain, environment, storage and queue tests. `npm run test:db` applies migrations to embedded PostgreSQL and tests RLS, authorization, constraints, receipts and conflicts. `npm run test:ui` uses the Expo Jest preset and React Native Testing Library. CI additionally defines a full local Supabase migration check. Embedded PostgreSQL tests do not exercise Supabase Auth, PostgREST or real network reconnection.

`npm run test:offline` is a restricted-environment fallback. It checks core TypeScript types, parses client syntax, and runs the core and embedded PostgreSQL tests. It does **not** replace the full application typecheck, UI tests, lint, audit or build. The `.tooling` fallback contains only three locally cached development dependencies and is ignored by Git. The cache bootstrap script is specific to this Windows environment; normal setup uses `npm install`.

## Scope and release gates

Growth, developmental interpretation, symptom/temperature workflows, daily check-in entry, sharing, exports and deletion are later backlog phases. Clinical features stay disabled pending review. The safety screen links general AAP education; it is not a clinically reviewed personalized advice engine. Privacy and consent wording are drafts.

Do not use the current scaffold for real infant records until the full runtime, security, recovery, accessibility, clinical-content and privacy checks in the original specifications are complete. The next task is to complete Sprint 1 acceptance on an installed app and configured Supabase environment before starting Sprint 2.
