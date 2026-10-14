# 06 — Clinical Safety, Decision Boundaries and Content Governance

**Product status:** health journaling and education, not a medical device/clinical diagnostic service. **Content accuracy is unverified for production until pediatric reviewers sign off on localized copy, age rules, and action thresholds.** Use explicit `review_status` and `effective_at` on safety rules.

## Allowed vs blocked behavior
**Allowed:** logging observed symptoms and care; displaying factual logged history; parent education linked to authoritative sources; prompt to seek medical assessment for clearly reviewed urgent signs; preparing clinician questions; viewing measurement histories.

**Blocked:** diagnosing allergies/infections/dehydration/stunting, calculating drug doses, recommending stopping breastfeeding, assuring safety from a normal check-in, predicting SIDS, auto-scoring health, making claims of professional endorsement, AI-generated personalized reassurance.

## Emergency information UX
Safety information is not a replacement for emergency services. The app should give a short direct message in Indonesian and English and emphasize urgent action rather than waiting for app response. Use location-appropriate messaging, but do not hardcode an emergency number unless verified per country and operational. For dangerous symptoms, display immediately on selection, even if the event has not been saved or there is no internet.

### Preliminary source-backed safety cases — require in-country clinician review
1. **Fever under age 3 months:** AAP says a baby younger than 3 months with rectal temperature >=38.0°C needs immediate pediatric assessment, even when otherwise well. On any temperature >=38.0°C in a <3-month-old, show prompt to seek immediate clinical advice; include measurement-site limitations and don't reassure with a non-rectal reading. Edge cases in neonates, hypothermia and other contexts require clinical rule review.
2. **Breathing difficulty, blue/grey coloration, unresponsiveness, seizure:** emergency warning — advise seeking emergency care immediately. Never try to calculate a probability or tell parents to wait for morning.
3. **Marked feeding decrease, fewer wet diapers or difficulty waking:** safety guidance should encourage prompt clinician contact; do not set a hard diaper count/feeding threshold without age-specific verified source and review.
4. **Blood in stool, pale/white stool, black/tarry stool or jaundice concern:** invite timely clinician assessment, considering age and meconium context; clinician must review wording and urgency for each scenario before enabling automated alerts.
5. **Possible food reaction:** record timing, symptoms and ingredients; allergic reactions require human care. Any respiratory/swelling emergency signs call for emergency care; do not diagnose causal allergen from one meal.

### Suggested message content for #1 (draft, not clinical sign-off)
ID: "Bayi berusia kurang dari 3 bulan dengan suhu 38,0°C atau lebih memerlukan penilaian medis segera. Hubungi dokter atau layanan gawat darurat sekarang. Jangan menunggu hasil dari aplikasi ini." 
EN: "A baby younger than 3 months with a temperature of 38.0°C or higher needs immediate medical assessment. Contact urgent medical care now. Do not wait for this app."

Add `measurement_site` to the event and the message. Not all measurement methods are equivalent for young infants. A pediatrician should approve exact temperature routing and localization.

## Safe sleep education
Per AAP safe sleep: back-to-sleep; firm, flat, non-inclined separate sleep space; fitted sheet; no pillows, loose blankets, soft toys. The app's timer does not monitor breathing and does not reduce SIDS risk. Place educational card in sleep onboarding/settings, not as an intrusive scare modal every night.

## Feeding and diaper education
- Breastfeeding duration cannot be converted into breastmilk millilitres. Never compute a misleading total for direct breastfeeds.
- Infant feeding schedules and volumes vary; do not instruct every parent to feed at rigid intervals or impose calorie targets.
- Solid foods generally begin around 6 months with developmental readiness; never require MPASI for younger baby unless caregiver opts in for clinician-directed reasons.
- Do not infer dehydration from low wet diaper count alone; log concern and recommend contacting clinician when appropriate.
- Do not imply maternal foods automatically cause symptoms in breastfed infants.
- Classic Bristol Stool Form Scale is inadequate for non-toilet-trained babies; simple description is MVP. Brussels Infant and Toddler Stool Scale could be considered after license/content review.

## Growth and development boundaries
- Use WHO Child Growth Standards only from official data and independently verified algorithms; see `07_GROWTH_DEVELOPMENT.md`.
- Percentiles are descriptive references, **not grades**, and require interpretation across time by trained clinicians.
- Do not label child stunted/underweight/obese or healthy based only on app-generated output.
- Preterm infants need special consideration: AAP guidance distinguishes adjusted age during developmental monitoring and appropriate preterm growth charts; default do not plot premature newborns on term WHO charts without validated policy.
- CDC milestones are developmental monitoring, not a diagnostic screen. Do not call `not yet` a diagnosis or send scary pushes.

## Rule engine requirements
Safety rules expressed as versioned records: `rule_id`, `locale`, `active`, `trigger_schema`, `title`, `body`, `action`, `severity`, `source_url`, `source_revision`, `clinical_reviewer`, `reviewed_at`, `next_review_due`. Ship reviewed rule bundles offline. A feature flag gates automatic interpretation of observations. If no reviewed localized rule exists, show neutral generic guidance to consult a clinician, not improvised heuristics.

Each triggered message saves an **audit-safe** event: code, baby id, rule version, displayed_at (avoid storing symptom text again). Tapping `Learn why` displays plain-language reason and official source. Never silently hide or suppress serious concerns because one previous alert was dismissed.

## Unsafe AI features: prohibit for v1
- Open-ended "Is my baby okay?" symptom chatbot with confident answers.
- Automatic dose calculations or prescriptions.
- "Normal" classification from empty logs or 7-day trends.
- Automated causal maternal-food/symptom or solid-food/allergen conclusions.
- Growth diagnoses, urgent triage probabilities or fabricated percentile charts.

## Clinical QA sign-off required before beta/public
- Pediatrician reviewed each safety scenario and message (including fever measurement method, neonates and preterm babies).
- Indonesian pediatrician reviewed cultural/health-system relevance and escalation language.
- Pediatric nutrition professional/lactation expert reviewed feeding and MPASI copy.
- Pediatric gastroenterology review if stool chart image/scale included.
- Developmental pediatric specialist reviewed milestone checklists and corrected-age presentation.
- Quantitative reference and formula review for WHO calculations; clinical interpretation copy approved.
- User research tests verify parents understand "not diagnosis" and alert next steps.

## Sources for these boundaries
- AAP fever: https://www.healthychildren.org/english/health-issues/conditions/fever/pages/when-to-call-the-pediatrician.aspx
- AAP infant fever and measurement sites: https://www.healthychildren.org/english/health-issues/conditions/fever/pages/fever-and-your-baby.aspx
- AAP Safe Sleep: https://www.aap.org/en/patient-care/safe-sleep/
- CDC introduction of solids: https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html
- CDC milestone monitoring vs screening: https://www.cdc.gov/act-early/about/developmental-monitoring-and-screening.html
- PubMed BITSS: https://pubmed.ncbi.nlm.nih.gov/30672767/
- AAP WHO term growth tools: https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/term-infant-growth-tools/
