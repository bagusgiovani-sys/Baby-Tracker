# Database setup and reversal guidance

Run commands from the application root, beside package.json.

1. Install Docker and the Supabase CLI using the official installation instructions.
2. Run `supabase start` and then `supabase db reset` only against the disposable local stack. Reset destroys its existing data and replays migrations and seed.sql.
3. Put the local API URL and public/anon key into `.env`. Never use a service-role key in client configuration.
4. Run `npm run test:db` for embedded PostgreSQL authorization and mutation checks. Also validate the full local Supabase stack and auth flows before a release; embedded tests do not replace PostgREST/Auth integration.

Migration `202610130001` creates account/profile, baby, membership, consent, invitation and audit foundations. Migration `202610130002` adds the normalized event tables, daily check-in foundation, receipt tracking and event RPCs. Apply them in filename order. Daily check-ins are not writable from the Sprint 1 client.

For a disposable local database, reversal is a reset to an explicitly selected earlier migration state using the installed CLI's documented reset options. Preserve any wanted data first. Never reset a shared or production database as a rollback procedure.

For a populated shared database, back up and verify restore capability, inspect dependent functions/policies, and write a new forward migration to repair the schema. Reverting these migrations by dropping tables destroys caregiver records, consent history and audit history. There is intentionally no automatic destructive down script.

Cloud deployment has not been performed. Review migrations and run staging tests before applying them to a specifically selected Supabase project. Check RLS under both anonymous and authenticated roles, direct table writes, cross-family requests, conflict receipts and auth redirects. Supabase's production default grants are explicitly revoked before the intended grants are added.

## Optional synthetic seed

`supabase/seed.sql` intentionally contains no real accounts. The optional `npm run db:seed` helper creates one fictional local account, baby and bottle event through Auth and the same RPC used by the app. Set `SUPABASE_LOCAL_SERVICE_ROLE_KEY` in the shell process environment, together with the local public key in `.env`. The helper accepts only localhost/127.0.0.1 on port 54321. Never put the admin key in an EXPO_PUBLIC variable or commit it.

The helper prints the synthetic account email. Request an email OTP in the app and read it in local Mailpit. The seed has not been executed in this environment because the Supabase stack is unavailable.
