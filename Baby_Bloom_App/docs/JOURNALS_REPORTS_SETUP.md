# Journals, themes, and reports

The application source is TypeScript. Existing Neon Garden and new Magical Unicorn palettes share animated components. After the full app splash, a first-visit picker saves presentation preferences on the device. Theme remains available alongside English/Bahasa; the tutorial is acknowledged once. Clearing site storage resets this preference. No baby records are stored in this presentation cache.

Food entries support ingredients, explicit portion units, offered/consumed amounts, texture, first exposure, observed reactions, and optional nutrition for the actual consumed portion. Bottle entries can also attach consumed-portion nutrition. Nutrition is user-entered from a named label/reference; the app does not assume a food's composition, convert household measures to grams, or estimate breastfeeding volume. A blank nutrient stays unknown; an explicit zero remains zero. Stool entries show recorded detail and visual color choices.

Daily check-ins are floating, draggable cards, with equivalent Next/Previous buttons. Answers remain `not_answered` until selected. Each baby/local day has one check-in; concurrent caregivers use version conflicts rather than overwriting each other. New records use the existing encrypted local event store and durable sync queue.

## Hosted Supabase: one required migration

In the existing Supabase project, open **SQL Editor → New query**, copy the entire contents of `supabase/migrations/202610140003_journals_reports.sql`, and run it once. Foundation migrations 001 and 002 must already be installed. This transaction adds normalized detail tables and preserves RLS, private JSON helpers, idempotency receipts, audit attribution, and expected versions. It does not delete existing diary data.

Confirm from a signed-in app that `journal_schema_version()` returns `3`, then reload. New journal saves are disabled while the server lacks this capability. Existing milk, diaper, and sleep logs continue using the original wire contract. The browser presentation theme and calculated reports do not require this migration.

For CLI-managed projects, apply migrations using your authenticated Supabase migration workflow instead of the SQL editor; do not apply the same file twice. Reversal: first deploy the previous client, archive/export the new normalized records under the owner's authorized backup process, then restore the previous RPC definitions. Do not drop the new tables while they contain user records. Never use `db reset` against production.

## Vercel: optional AI server configuration

On **baby-bloom-gio → Settings → Environment Variables**, add `OPENAI_API_KEY` for Production (and Preview only if desired). This is a server-only variable: never give it an `EXPO_PUBLIC_` prefix. `OPENAI_MODEL` is optional; the default is `gpt-4.1-mini-2025-04-14`, configurable for models supporting Responses structured outputs. Redeploy after changing environment values.

The TypeScript `/api/reports` function verifies the bearer session, obtains the permitted baby using the caller's RLS context, rebuilds factual totals from server records, and sends only aggregate numeric facts and age/measurement context to OpenAI with `store:false`. It never sends names, record IDs, dates of birth, nutrition-source descriptions, ingredients, or free-text notes to OpenAI. No service-role key is used. Explicit consent is required. A persistent database quota limits attempted AI requests to five per authenticated user per UTC day across serverless instances. Failed provider attempts count toward this limit.

The model prioritizes eligible, reviewed diary insight codes. The server rejects unsupported codes; bilingual rendering supplies bounded explanatory text. AI cannot change totals, invent clinical thresholds, diagnose deficiencies, prescribe supplements, or produce arbitrary HTML. Actual provider availability/billing and hosted end-to-end generation require the configured API key and a permitted test account; fixture tests alone do not prove these.

## Reports and medical interpretation

Select 7 or 30 calendar days ending on a selected date in the baby's timezone. Daily calorie bars and downloadable SVG infographics show recorded totals and data coverage. Measurements use raw kg/cm and their recency. Corrected age uses a 40-week reference for babies born before 37 weeks, before the second calendar birthday, only when gestation weeks and additional days are known. It is developmental context, not a nutrition target formula.

Individual adequacy and suggested treatment for a shortfall require clinical assessment; partial logs do not establish total intake or nutritional deficiencies. The report explains this and provides consultation prompts. Growth percentiles, diagnosis, dosing, and personalized clinical rules remain disabled. Nutrition/clinical wording still needs independent local clinical review before a public clinical release.

Primary references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [GPT-4.1 mini model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [CDC infant nutrition](https://www.cdc.gov/infant-toddler-nutrition/faqs/index.html), [AAP corrected age](https://www.healthychildren.org/English/ages-stages/baby/preemie/Pages/Corrected-Age-For-Preemies.aspx), [WHO preterm definition](https://www.who.int/en/news-room/fact-sheets/detail/preterm-birth), [AAP stool colors](https://www.healthychildren.org/English/ages-stages/baby/Pages/The-Many-Colors-of-Poop.aspx).

If the new RPC remains missing after running the migration, open a new SQL Editor query in the same project and run:

```sql
select public.journal_schema_version();
notify pgrst, 'reload schema';
```

The SELECT should return 3. A function-missing error means the migration is not installed in that database. A successful SELECT followed by NOTIFY refreshes the API schema cache; reload the app afterward.
