# Vercel deployment

Vercel web deployment is the current delivery priority. The source is prepared, but no Vercel project or deployment has been created from this workspace yet. Both account connections and a successful remote build remain required.

## Project configuration

Use this folder (the one containing package.json and vercel.json) as the project root. If importing the outer Baby_Tracker folder as a Git repository, set Vercel's Root Directory to `BabyBloom_Codex_Specs`.

- Framework preset: Other (the explicit `framework: null` in vercel.json).
- Node: 22.x, constrained by package.json.
- Build: `npm run build:vercel`.
- Output: `dist`.
- Installation: Vercel's npm detection; generate and commit a lockfile once registry access permits installation. No `--force` or `--legacy-peer-deps` workaround is configured.

The build validates the public backend configuration, runs the full TypeScript check, and exports Expo's single-page web app. Build failures must be fixed before treating the URL as usable. The local environment still cannot download Expo or run the full build.

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

With authorized Vercel and Supabase integrations, inspect the chosen projects and use their supported deployment/configuration tools. Do not assume a suggested integration is connected.

For a terminal with registry access and a signed-in Vercel account, deployment can instead use:

```powershell
cd C:\Exodus\Projects\Baby_Tracker\BabyBloom_Codex_Specs
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
