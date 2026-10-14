# Journals, themes, and reports

The application source is TypeScript. Existing Neon Garden and new Magical Unicorn palettes share animated components. After the full app splash, a first-visit picker saves presentation preferences on the device. Theme remains available alongside English/Bahasa; the tutorial is acknowledged once. Clearing site storage resets this preference. No baby records are stored in this presentation cache.

Food entries support ingredients, explicit portion units, offered/consumed amounts, texture, first exposure, observed reactions, and optional nutrition for the actual consumed portion. Bottle entries can also attach consumed-portion nutrition. Nutrition is user-entered from a named label/reference; the app does not assume a food's composition, convert household measures to grams, or estimate breastfeeding volume. A blank nutrient stays unknown; an explicit zero remains zero. Stool entries show recorded detail and visual color choices.

Daily check-ins are floating, draggable cards, with equivalent Next/Previous buttons. Answers remain `not_answered` until selected. Each baby/local day has one check-in; concurrent caregivers use version conflicts rather than overwriting each other. New records use the existing encrypted local event store and durable sync queue.

## Hosted Supabase: one required migration

In the existing Supabase project, open **SQL Editor → New query**, copy the entire contents of `supabase/migrations/202610140003_journals_reports.sql`, and run it once. Foundation migrations 001 and 002 must already be installed. This transaction adds normalized detail tables and preserves RLS, private JSON helpers, idempotency receipts, audit attribution, and expected versions. It does not delete existing diary data.

Confirm from a signed-in app that `journal_schema_version()` returns `3`, then reload. New journal saves are disabled while the server lacks this capability. Existing milk, diaper, and sleep logs continue using the original wire contract. The browser presentation theme and calculated reports do not require this migration.

For CLI-managed projects, apply migrations using your authenticated Supabase migration workflow instead of the SQL editor; do not apply the same file twice. Reversal: first deploy the previous client, archive/export the new normalized records under the owner's authorized backup process, then restore the previous RPC definitions. Do not drop the new tables while they contain user records. Never use `db reset` against production.

## Free AI: Groq server configuration

1. Sign in at [Groq Console](https://console.groq.com) and keep the account on the **Free** plan. This plan has usage limits; upgrading to Developer enables token billing. The app cannot determine your account's billing plan.
2. Open [API Keys](https://console.groq.com/keys), choose **Create API Key**, name it **Baby Bloom**, and copy the generated secret.
3. Open [baby-bloom-gio environment variables](https://vercel.com/bagusgiovanis-projects/baby-bloom-gio/settings/environment-variables). Add **Key** `GROQ_API_KEY`, **Value** the generated Groq secret, **Environment** Production, then **Save**. This is server-only: never use an `EXPO_PUBLIC_` prefix or commit the secret. No OpenAI key or ChatGPT subscription is required.
4. In [Groq Data Controls](https://console.groq.com/settings/data-controls), enable **Zero Data Retention**. By default inference data is not retained, but without ZDR Groq may retain inputs/outputs for reliability or abuse investigations for up to 30 days. Aggregate child/health context is still sensitive even without names.
5. Redeploy the latest `main` deployment in **baby-bloom-gio → Deployments** so the server receives the new environment variable. Reload the app, sign in, sync entries, open **Reports**, select 7 or 30 days, review the Groq consent checkbox, and choose **Generate AI insights**.

The TypeScript `/api/reports` function verifies the bearer session, obtains the permitted baby using the caller's RLS context, rebuilds factual totals from server records, and sends only aggregate numeric facts and age/measurement context to **Groq's `openai/gpt-oss-120b`** using strict JSON-schema output. It never sends names, record IDs, dates of birth, nutrition-source descriptions, ingredients, or free-text notes to the provider. No service-role key is used. Explicit consent names Groq. No paid fallback or automatic provider retry is implemented. Groq Chat does not support the `store` parameter; retention is controlled by the account's Data Controls, not a request flag. A persistent database quota limits attempted AI requests to five per authenticated user per UTC day across serverless instances. Failed provider attempts count toward this limit.

Groq's published Free plan limits for this model at the time of implementation are 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day; your organization's console limits are authoritative and these limits can change. Requests use at most 2,048 completion tokens, including reasoning. The app distinguishes provider quota exhaustion from its own five-per-day limit; calculated totals/charts remain usable in either case. There is no guarantee of unlimited or permanently free API availability.

The model prioritizes eligible, reviewed diary insight codes. The server rejects unsupported codes, malformed JSON, refusals and truncated responses; bilingual rendering supplies bounded explanatory text. AI cannot change totals, invent clinical thresholds, diagnose deficiencies, prescribe supplements, or produce arbitrary HTML. Actual provider availability and hosted end-to-end generation require the configured Groq key, migration 003 and a permitted test account; fixture tests alone do not prove these.

## Reports and medical interpretation

Select 7 or 30 calendar days ending on a selected date in the baby's timezone. Daily calorie bars and downloadable SVG infographics show recorded totals and data coverage. Measurements use raw kg/cm and their recency. Corrected age uses a 40-week reference for babies born before 37 weeks, before the second calendar birthday, only when gestation weeks and additional days are known. It is developmental context, not a nutrition target formula.

Individual adequacy and suggested treatment for a shortfall require clinical assessment; partial logs do not establish total intake or nutritional deficiencies. The report explains this and provides consultation prompts. Growth percentiles, diagnosis, dosing, and personalized clinical rules remain disabled. Nutrition/clinical wording still needs independent local clinical review before a public clinical release.

Primary references: [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [GPT-OSS 120B on Groq](https://console.groq.com/docs/model/openai/gpt-oss-120b), [Free plan limits](https://console.groq.com/docs/rate-limits), [Groq billing](https://console.groq.com/docs/billing-faqs), [Groq data controls](https://console.groq.com/docs/your-data), [CDC infant nutrition](https://www.cdc.gov/infant-toddler-nutrition/faqs/index.html), [AAP corrected age](https://www.healthychildren.org/English/ages-stages/baby/preemie/Pages/Corrected-Age-For-Preemies.aspx), [WHO preterm definition](https://www.who.int/en/news-room/fact-sheets/detail/preterm-birth), [AAP stool colors](https://www.healthychildren.org/English/ages-stages/baby/Pages/The-Many-Colors-of-Poop.aspx).

If the new RPC remains missing after running the migration, open a new SQL Editor query in the same project and run:

```sql
select public.journal_schema_version();
notify pgrst, 'reload schema';
```

The SELECT should return 3. A function-missing error means the migration is not installed in that database. A successful SELECT followed by NOTIFY refreshes the API schema cache; reload the app afterward.
