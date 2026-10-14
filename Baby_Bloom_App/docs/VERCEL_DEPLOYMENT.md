# Vercel deployment

## Current redesigned application

Current always-on/header/splash update: user explicitly removed motion controls and requested always-on animation, a persistent English/Bahasa top selector, and a Hi, Mom! animated fetus splash. Implemented in TypeScript with no new dependencies. Source checks pass (63 results), and local/remote guarded builds pass. Deployment dpl_EDueYysBZFkfdywUzaMWaZ2ZDrvz is READY at the primary app. HTTP checks verify the new markers, removed controls, deferred JavaScript and SQLite assets. Actual live heart/fetus modules move in isolated DOM fixtures even with device reduction enabled; graphical browser QA remains unavailable. The intro appears once per full app load and waits for initial session readiness before its exit. No Git commit/push was made. Older motion-control descriptions below are deployment history, not current behavior.

Motion-control fix on 2026-10-14: the primary welcome URL was confirmed by the user. The header now offers Enable animations / Reduce animations, and Settings offers saved system/full/reduced choices. Full checks pass (61 results), and local/remote guarded builds pass. Deployment dpl_8MDNTYZYhFEN2QQMfB3QBDXi5eur is READY at the primary host. Anonymous HTTP checks verify the toggle/preferences, deferred JavaScript, headers and SQLite assets. The actual live bundle moves in an isolated DOM fixture with a deliberate full override even when the device preference requests reduction; this does not verify graphical browser appearance. Only baby-bloom-gio was targeted by this fix; the earlier omega project remains unused. Source has not been committed or pushed.

Motion follow-up on 2026-10-14: the orbital atom has been replaced by a pulsing care heart and baby silhouette. Screen focus replays slide/fade entrances while preserving draft input. Sections reveal in the viewport, care icons move, and skeletons shimmer during real loading. Four web screens use React.lazy/Suspense and export as separate JavaScript chunks; the essential editor warms after online login. Source checks pass (55 results), and local/remote guarded exports pass. Deployment dpl_DHHuiJTiXg9oBcJ5bx1byvcYcF8v is READY at the primary app. Anonymous HTTP checks verify the new heart/skeleton markers, four deferred chunks returning JavaScript, app shells, isolation headers and SQLite assets. Browser animation playback remains unverified because the browser connection cannot start. No new dependency installation was needed, and this update was published directly through CLI without creating or pushing Git history.

Primary user app: [https://baby-bloom-gio.vercel.app](https://baby-bloom-gio.vercel.app). The green/black Framer Motion redesign and resend-code flow were published to the user's dashboard-created baby-bloom-gio project on 2026-10-14. That project is connected to the same Baby-Tracker repository; its previously unset Root Directory and build settings were configured for Baby_Bloom_App, Node 22.x, npm ci, the guarded build and dist. Existing public backend variables were preserved. The latest deployment reached READY; anonymous HTTP checks confirm the app shells, configured backend, redesigned bundle markers, required headers and SQLite assets. Browser visual QA and actual email delivery are unverified.

For this primary app, Supabase Auth Site URL should be `https://baby-bloom-gio.vercel.app`, with `https://baby-bloom-gio.vercel.app/auth/callback` allowlisted. The agent has not changed Supabase's URL configuration. Keep any callback URLs needed for other supported hosts/native builds.

The workspace's existing .vercel link still identifies the earlier babybloom CLI project. For future uploads to the primary app, run the documented repository-root CLI command with `--project baby-bloom-gio` instead of `--project babybloom`. Both source trees still need a normal Git commit/push to preserve this turn's edits in future Git deployments; no new Git history was created or pushed by this turn.

The installer issue found while adding Framer Motion was corrected by regenerating the lockfile with npm 10.9.4 in a clean directory, matching Vercel's npm major version. Fresh Linux installation and remote builds pass. Existing security findings remain visible; no force dependency upgrade or legacy-peer-deps workaround was applied.

## Earlier CLI deployment

BabyBloom is deployed at [https://babybloom-omega.vercel.app](https://babybloom-omega.vercel.app). The new babybloom project belongs to the user's personal Vercel Hobby workspace. Its production deployment reached READY on 2026-10-14 after npm ci, public configuration validation, full TypeScript and Expo web export succeeded remotely.

Anonymous HTTP verification passed for the root, /sign-in and /auth/callback app shells, isolation/security headers, application JavaScript with the configured public backend, SQLite WASM with correct MIME/magic bytes, the actual deployed SQLite worker, and the public Supabase auth settings endpoint (email enabled). This verifies hosting and backend reachability, not interactive login or browser persistence. Dependency findings and Sprint 1 runtime acceptance remain open.

Next in Supabase Authentication URL Configuration:

- Site URL: `https://babybloom-omega.vercel.app`
- Redirect URL: `https://babybloom-omega.vercel.app/auth/callback`

These backend settings have not been changed by this agent; Supabase management access remains unavailable. Preserve required native callbacks. Then test email sign-in and synthetic logging on a phone.

## Project configuration

Use this folder (the one containing package.json and vercel.json) as the project root. If importing the outer Baby_Tracker folder as a Git repository, set Vercel's Root Directory to `Baby_Bloom_App`.

- Framework preset: Other (the explicit `framework: null` in vercel.json).
- Node: 22.x, constrained by package.json.
- Build: `npm run build:vercel`.
- Output: `dist`.
- Installation: Vercel's npm detection using the generated app package-lock.json. No `--force` or `--legacy-peer-deps` workaround is configured.

The build validates the public backend configuration, runs the full TypeScript check, and exports Expo's single-page web app. Both local and remote guarded builds pass. Runtime acceptance and dependency security findings remain open. A local .env is loaded optionally for preflight; cloud-provided variables keep precedence.

The hosting configuration follows [Expo's Vercel deployment guide](https://docs.expo.dev/guides/publishing-websites/#vercel). It supplies SPA route fallback for direct links and auth callbacks, plus cross-origin isolation for SQLite WASM. Unlike some other hosts, Vercel reads these headers from vercel.json, not public/\_headers. See [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Supabase configuration

For dashboard setup from scratch, follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md), including the two SQL scripts and email templates.

Set these in Vercel Project Settings > Environment Variables for each intended deployment environment:

| Name                          | Value                                  |
| ----------------------------- | -------------------------------------- |
| EXPO_PUBLIC_SUPABASE_URL      | The project's public HTTPS API origin  |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Its publishable key or legacy anon key |

These values are compiled into the browser bundle. Never set a service-role/secret key here. Redeploy after changing them. Production and Preview should point to the intended backend; a separate test backend is preferable for previews.

An existing Supabase account does not automatically create this app's database schema. Select the intended project, inspect existing migrations/tables, and apply the two tracked migrations in order if not already applied. Do not reset a cloud database. Keep existing records and settings intact. See MIGRATIONS.md.

After Vercel assigns the stable URL, set Supabase Auth's Site URL to that HTTPS origin and allow its exact `/auth/callback` URL. For previews, allow only the specific preview callback being tested. Keep any required native callbacks. Configure the email template to include `{{ .Token }}` for code entry and verify delivery. The default hosted sender has restrictions; see [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Deployment paths

Session progress on 2026-10-14: Vercel CLI 64.0.2 was downloaded into the ignored workspace npm execution cache. Browser device authorization succeeded, the new babybloom project was linked, and the two public Supabase settings were configured for production. CLI telemetry was disabled. CLI authentication uses a separate global configuration directory at `C:/Users/kodec/AppData/Local/Temp/babybloom-vercel-auth`, outside the repository. Do not copy its authentication files or tokens into the repository. The Vercel plugin itself remains unconnected; this deployment used the CLI.

Vercel also connected the existing GitHub repository during linking. Its Root Directory is Baby_Bloom_App, Node is 22.x, installation is npm ci, build is npm run build:vercel, and output is dist. The local rename and edits have not been committed or pushed by this agent. Future Git builds require the renamed application folder in the remote checkout. Preview backend settings remain unconfigured; do not assume previews can authenticate.

Because the cloud project has an app Root Directory, CLI source uploads must start from the outer Baby_Tracker folder and explicitly select Baby_Bloom_App/vercel.json. The outer .vercelignore excludes credentials, caches, generated exports, local databases and the old spec archive. The final dry run verified 102 upload entries with the app lockfile present and no excluded sensitive files. Vercel's generated .env.local contains session configuration and remains ignored by Git and uploads.

For another source deployment using this session's cached CLI, run from Baby_Tracker:

```powershell
node Baby_Bloom_App/.npm-cache/_npx/c96642427131a8ff/node_modules/vercel/dist/vc.js --global-config C:/Users/kodec/AppData/Local/Temp/babybloom-vercel-auth --no-color --scope bagusgiovanis-projects --local-config Baby_Bloom_App/vercel.json deploy --project babybloom --prod --yes
```

The cache-specific path may change after cleanup; use a normal installed Vercel CLI instead when appropriate, preserving the repository-root upload path and project configuration.

To restart this session's login flow if needed:

```powershell
npm exec --yes --offline=false --cache .npm-cache --package=vercel@64.0.2 -- vercel login --global-config C:/Users/kodec/AppData/Local/Temp/babybloom-vercel-auth --no-color
```

Subsequent session CLI commands must use that same global configuration directory. Verify account identity and the intended project/team before linking. This cache installation did not change application dependency versions or its lockfile.

With authorized Vercel and Supabase integrations, inspect the chosen projects and use their supported deployment/configuration tools. Do not assume a suggested integration is connected.

For a terminal with registry access and a signed-in Vercel account, deployment can instead use:

```powershell
cd C:\Exodus\Projects\Baby_Tracker\Baby_Bloom_App
npx vercel login
npx vercel link
npx vercel env add EXPO_PUBLIC_SUPABASE_URL production
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

Enter the public values at the prompts; do not put credentials into shell history. Vercel installs and builds remotely, so the initial upload need not include a locally generated dist folder. Remote registry access does not guarantee dependency compatibility: inspect build results and fix any errors.

## Verify before handing over the phone link

Confirm a successful build and deployed URL. Open the root, `/sign-in` and `/auth/callback` directly; confirm required headers and successful WASM asset loading. Verify email sign-in, baby creation and one synthetic event on phone and tablet widths. Reload to check persistence, log offline in an already loaded tab, reconnect and verify one server record. Check a second account cannot read the first account's data.

Cold offline browser launch is still unsupported. Native installation is deferred while web deployment is prioritized.
