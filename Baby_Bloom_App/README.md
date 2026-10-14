# BabyBloom

Mobile-first infant activity tracker built with Expo Router, React Native, TypeScript, SQLite and Supabase. Indonesian is the default language; English is included. The same codebase targets Android, iOS, tablet and responsive web.

Live web app: [BabyBloom](https://baby-bloom-gio.vercel.app). The green/black redesign and resend flow are published to the user's dashboard-created baby-bloom-gio project. Vercel's remote build and hosting HTTP checks pass. Supabase Auth must use this Site URL and allow its /auth/callback URL; interactive sign-in and browser/device acceptance remain pending. See [deployment details](docs/VERCEL_DEPLOYMENT.md).

The TypeScript UI uses a black/green theme with always-on motion, a pulsing care heart, animated icons, screen transitions and section reveals. Web uses Framer Motion; native uses built-in Animated. English/Bahasa stays in the shared top header, including during the Hi, Mom! launch splash with a pulsing fetus. The intro appears once per full reload; normal navigation does not replay it. Skeletons cover initialization and lazy screen downloads. History, settings, onboarding and logging export as separate web chunks, with the editor warmed after online login. Email signup and login share one flow; resend has a countdown and the address can be corrected. All 63 test results pass, including real engine, splash lifecycle and language selection cases. Isolated DOM playback does not verify graphical browser appearance or actual email delivery.

Sprint 0/1 source is implemented: email OTP, consent and baby onboarding, Today summaries, feeding/diaper/sleep forms, timers, history, editing/deletion, durable offline mutations and explicit conflict resolution. Installed app types, lint, core/database/component tests and web export have been checked. **This is not a verified production release:** dependency audit findings, real authentication and browser/device acceptance remain open. See [implementation status](docs/IMPLEMENTATION_STATUS.md).

The original [build-pack README](docs/BUILD_PACK_README.md), [field dictionary](docs/02_DAILY_DATA_DICTIONARY.md), [backlog](docs/09_IMPLEMENTATION_BACKLOG.md) and [agent instructions](AGENTS.md) remain requirements. Implementation assumptions are recorded in [DECISIONS.md](docs/DECISIONS.md).

## Development setup

**Web deployment priority:** see [Vercel setup and deployment](docs/VERCEL_DEPLOYMENT.md). Hosting routes, database isolation headers and build-time Supabase configuration checks are supplied in `vercel.json`.

For first-time backend setup, follow [Supabase setup step by step](docs/SUPABASE_SETUP.md).

Known errors, fixes, validation evidence and unresolved blockers are tracked in [ERRORS_AND_FIXES.md](docs/ERRORS_AND_FIXES.md).

If TSX files show errors throughout the editor, follow [EDITOR_SETUP.md](docs/EDITOR_SETUP.md) and run `npm run doctor` to check whether app dependencies are installed.

Use Node 22.15 or newer. Run these commands from this folder, beside package.json:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run format
npm run check
```

Run commands from `Baby_Bloom_App`, which contains package.json. Dependencies and package-lock.json are now installed; use `npm ci` for a repeatable clean installation. Prettier has formatted and checked the source. The installed Expo SDK compatibility check passed in offline mode; a network-enabled check and dependency audit remain required before release.

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` to the selected project's URL and publishable/anon key. Never place a secret/service-role key in an EXPO_PUBLIC variable. The Vercel project is now deployed with these public production settings; Supabase Auth URL changes still need to be completed.

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
npm run audit:dependencies # Online audit; high/critical findings fail
npm run audit:runtime      # Online audit excluding development dependencies
```

`npm test` runs domain, environment, storage and queue tests. `npm run test:db` applies migrations to embedded PostgreSQL and tests RLS, authorization, constraints, receipts and conflicts. `npm run test:ui` uses the Expo Jest preset and React Native Testing Library. CI additionally defines a full local Supabase migration check. Embedded PostgreSQL tests do not exercise Supabase Auth, PostgREST or real network reconnection.

CI lives in the outer repository's [.github/workflows/checks.yml](../.github/workflows/checks.yml), targets Baby_Bloom_App and exports using synthetic backend settings. Updated audits report 63 findings for the Windows installation (60 excluding development dependencies) and 64 for Vercel's Linux installation; see [dependency review](docs/DEPENDENCY_REVIEW.md). The audit gate remains open.

Generate lockfile updates with npm 10 to match Vercel's Node 22 build environment. The redesign lockfile was regenerated with npm 10.9.4 in a clean directory to preserve optional cross-platform dependencies; npm 11's existing-install regeneration omitted entries required by Vercel's npm ci. No --force or --legacy-peer-deps installation workaround is used.

`npm run test:offline` is a restricted-environment fallback. It checks core TypeScript types, parses client syntax, and runs the core and embedded PostgreSQL tests. It does **not** replace the full application typecheck, UI tests, lint, audit or build. The `.tooling` fallback contains only three locally cached development dependencies and is ignored by Git. The cache bootstrap script is specific to this Windows environment; normal setup uses `npm install`.

## Scope and release gates

Growth, developmental interpretation, symptom/temperature workflows, daily check-in entry, sharing, exports and deletion are later backlog phases. Clinical features stay disabled pending review. The safety screen links general AAP education; it is not a clinically reviewed personalized advice engine. Privacy and consent wording are drafts.

Do not use the current scaffold for real infant records until the full runtime, security, recovery, accessibility, clinical-content and privacy checks in the original specifications are complete. The next task is to complete Sprint 1 acceptance on an installed app and configured Supabase environment before starting Sprint 2.
