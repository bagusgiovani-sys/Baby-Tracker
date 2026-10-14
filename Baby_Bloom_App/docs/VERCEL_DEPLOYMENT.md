# Vercel deployment

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

The hosting configuration follows [Expo's Vercel deployment guide](https://docs.expo.dev/guides/publishing-websites/#vercel). It supplies SPA route fallback for direct links and auth callbacks, plus cross-origin isolation for SQLite WASM. Unlike some other hosts, Vercel reads these headers from vercel.json, not public/_headers. See [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Supabase configuration

For dashboard setup from scratch, follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md), including the two SQL scripts and email templates.

Set these in Vercel Project Settings > Environment Variables for each intended deployment environment:

| Name | Value |
| --- | --- |
| EXPO_PUBLIC_SUPABASE_URL | The project's public HTTPS API origin |
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
