# Supabase setup for BabyBloom on Vercel

Follow these steps when you are ready to connect the backend. The app is not deployed yet. Having a Supabase account is the first step; you also need a project, its database schema, and login configuration. No Docker installation is needed for this dashboard-based route.

## 1. Create the project

Open [Supabase Dashboard](https://supabase.com/dashboard), sign in, and select **New project** in your organization. Name it `BabyBloom`, choose a database password and region, and create the project. Keep the database password in your password manager; it is not an app environment variable. Keep the project's Data API enabled.

Use a fresh dedicated project for these instructions. An existing project that already contains BabyBloom tables should be inspected rather than replaying the setup scripts. See [Supabase's project quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs).

## 2. Create the tables and permissions

Open the new project's **SQL Editor**, then a **New query**. Open the local file [202610130001_foundation.sql](../supabase/migrations/202610130001_foundation.sql), copy its entire contents, paste them into the SQL Editor, and click **Run**. Wait for success.

Open another new query and repeat with [202610130002_core_tracking.sql](../supabase/migrations/202610130002_core_tracking.sql). Run the foundation file first. These scripts create the schema, security policies and functions used by the app; do not substitute the generic example tables from the Supabase quickstart.

Confirm that Table Editor shows `babies`, `baby_memberships`, `care_events`, `feeding_details`, `diaper_details` and `sleep_details`. Empty tables are expected. Create babies and log records through the app after login, so membership and consent records are created correctly. Leave Row Level Security enabled.

Run each setup file once. If a query fails, stop and retain the error message; do not delete tables to bypass it. These files use transactions, so a failed file rolls back its own changes. SQL Editor setup does not add CLI migration-history records; future CLI deployment must reconcile this setup before replaying the same migrations.

## 3. Copy the public connection values

Open the project's **Connect** dialog and copy its **Project URL** and **Publishable key**. Keys are also available under **Settings > API Keys**. The publishable key starts with `sb_publishable_`. A legacy anon key is also accepted by the app, but use the publishable key for a new project. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

You do not need to give the browser app your database password, personal access token, service-role key or secret key.

## 4. Configure email-code login

In **Authentication**, open the email provider configuration and ensure Email and new-user signup are enabled. Keep email confirmation enabled.

The hosted dashboard may show **Set up custom SMTP to edit templates**. If it does, editing is unavailable until SMTP is configured. For the quickest team-account test, keep the default templates and use the emailed magic link instead of a numeric code. The app has a callback route for that flow; open the link in the same browser and on the same device where you requested it. Full remote authentication verification remains pending deployment. Numeric OTP requires a template that actually includes the token.

Open **Email Templates** and select **Magic Link / OTP**. Make sure the message body contains the following so the app can accept a code:

```html
<h2>BabyBloom sign-in code</h2>
<p>Your code is: <strong>{{ .Token }}</strong></p>
```

Save the template. If the dashboard uses a separate **Confirm signup** template for first-time users, include the same token there too. See [email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [passwordless email login](https://supabase.com/docs/guides/auth/auth-email-passwordless).

If template editing is locked, do this token-template step after Custom SMTP setup; do not assume the default email contains a numeric code.

For initial testing, the default email sender only accepts addresses belonging to your Supabase organization team and has a low sending limit. Use your team-account email. Before allowing other users to sign in, configure **Custom SMTP** in Authentication with your email provider's host, port, username, password and verified sender address. Save and test delivery. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).

## 5. Add the values in Vercel

In the Vercel project's **Settings > Environment Variables**, add these exact names:

| Variable | Value |
| --- | --- |
| EXPO_PUBLIC_SUPABASE_URL | Your HTTPS Project URL, such as `https://your-project.supabase.co` |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Your publishable key |

The second variable keeps its existing name even when its value is a publishable key. Select Production, and Preview if those deployments should use the same test backend. Save the settings and deploy/redeploy. Settings are compiled into the web app, so saving them alone does not update an existing deployment.

The app's Vercel root is the folder containing package.json and vercel.json. Build command is `npm run build:vercel`; output directory is `dist`; framework preset is Other. See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for project creation and upload paths. The full build must pass before a working phone link can be handed over.

## 6. Set the website addresses in Supabase

After Vercel provides the stable deployed URL, open Supabase **Authentication > URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/auth/callback`

Replace both examples with the actual Vercel address and save. Add the exact callback of any preview you intend to test. Existing native callbacks can remain. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 7. Test from your phone

Open the Vercel URL in your phone browser. Enter your allowed test email, request a code, and paste the code from the email into the app. Create a fictional baby and one feeding, diaper or sleep record. Reload and verify it remains visible. Confirm that **Authentication > Users** contains the signed-in account and Table Editor contains the test event.

If the email does not arrive, check spam, team-address restrictions, sending limits and SMTP configuration. A missing-function/table error points to step 2; a configuration error points to step 5. If the Vercel build fails, inspect its build log rather than assuming deployment succeeded.
