# 07 — Growth and Development Subsystems

## A. Growth tracking scope
Input measurements: **weight (kg)**, **recumbent length (cm)**, **head circumference (cm)**, observed date/time, source and provenance. Record raw data and simple time series immediately; WHO percentiles and z-scores must remain behind `growth_reference_enabled = false` until validated. Daily weighing is not required.

### Standard/reference plan
WHO Child Growth Standards age 0–24 months for term infants (sex-specific tables). Indicators:
1. weight-for-age;
2. length-for-age;
3. weight-for-length;
4. head circumference-for-age.

Do not use a fabricated polynomial or approximate published growth curves. Source official WHO tables and/or WHO anthropometry analysis tools. Include a fully documented LMS/reference methodology and verified test fixtures. For each computed result persist/display: indicator, raw value, normalized unit, reference dataset version, age basis, computed z-score, percentile if supported by validated formula, computation timestamp and independent test status.

### Prematurity / gestational age
Input gestational weeks/days at birth OR due date. Store chronological age and a clearly labeled corrected age where applicable, using a documented method anchored to gestational weeks versus 40 weeks / due date. Special neonatal/preterm charts (e.g. Fenton) may be clinically appropriate before transition to WHO; do **not** auto-plot a preterm neonate on term WHO without approved protocol. AAP parent guidance describes corrected age in development typically through 2 years; AAP clinical growth tools mention use of corrected age in preterm growth tools through 3 years. This distinction must be a clinician-reviewed, context-specific policy—not an arbitrary universal cutoff.

**Incorrect case to avoid:** baby 32-week GA, now 16 weeks chronological, display 4-month developmental milestones as overdue. Corrected age is approximately 8 weeks in this example; do not mislabel as delayed.

### Measurement validation
- `weight_kg`: stored as numeric; UI accepts kg or grams conversion explicitly. Do not accept negative values; extreme-but-possible readings need user confirmation and clinic referral wording if indicated by reviewed logic, not silent rejection.
- `length_cm`, `head_cm`: normalized centimeters; display mm/decimal precision appropriately. Age-related ranges used only for probable data-entry error warnings validated in testing.
- A measurement must specify a source label: home, Posyandu, Puskesmas, clinic, other. Source not equal to independent verification.
- Duplicate same-day readings permitted; display timestamps, source and supersession indicator.
- Chart axes are actual dates/age, not uniformly spaced "monthly" measurements if dates differ.
- No daily/weekly percentile "improvement" rewards; avoid encouraging overmeasurement.

### Test plan for computation (not optional)
- Official WHO reference tables and fixtures committed with `source` + license metadata and integrity hash.
- At least 20 reference points per indicator across sexes and ages, including exact LMS median, -2SD and +2SD points, cross-verified against a trusted WHO tool/software.
- Leap-day DOB, preterm, missing sex, missing length and out-of-bounds values.
- Definition of completed days/months for growth reference is explicit; no rounding age to nearest month unless the official reference method requires it.
- Double-check nonlinear tails and percentile transform method against WHO methodology.
- Flag `reference_verified` false by default, disable medical interpretation and charts that are not ready.

## B. Milestones
Use CDC age groups in MVP where content permitted and reviewed: 2, 4, 6, 9, 12, 15, 18 and 24 months (extension 30 months+ future). Domains: social/emotional; language/communication; cognitive; movement/physical. Content localized, versioned and source-identified. Never scrape and silently ship third-party copyrighted illustrations without permission.

Observation enum: `achieved`, `not_yet`, `unsure`, `not_answered`; date first seen optional; notes. Do not erase past progress if checklist source updates. Corrected-age view for preterm infants reviewed by pediatricians; UI can show both chronological and corrected ages where appropriate.

### Milestone UI and messaging
- Intro copy: "Ini membantu mencatat perkembangan, bukan tes diagnosis. Jika ada kekhawatiran, diskusikan dengan dokter anak."
- Milestones are not a school test, and lists are not expected to be complete at a chosen birthday.
- If user explicitly reports **loss of previously gained skills**, provide prompt to contact pediatrician (review urgency clinically before automated routing).
- Do not compute "percent of normal" or a development IQ score.

## C. Vaccine records / Indonesia
Manual vaccination history in MVP, including vaccine/dose/date/site, verified vs self-reported evidence. Kemenkes **Buku KIA 2024** is an important official local reference; schedule and regional introduction may change. Implement a versioned schedule catalogue (`country`, `region`, `effective_from`, `effective_to`, `verified_source`, `clinical_signoff`) only after confirming the relevant current Kemenkes program as of launch and designing catch-up with clinicians. Do not auto-book or automatically label overdue from an outdated static table.

## D. Clinician report
Suggested layout: identity (baby nickname & DOB only as opted in), reporting window/timezone, last recorded growth points with sources, feeding/diaper/sleep summaries annotated as *recorded*, vaccination history, milestone observations, concerns and notes; references to source/version when growth calculation included. PDF/CSV with human-readable headings and explicit missing-data note.

## Sources
- WHO standards: https://www.who.int/tools/child-growth-standards
- WHO software/tools: https://www.who.int/toolkits/child-growth-standards/software
- AAP growth tools, term: https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/term-infant-growth-tools/
- AAP preterm growth tools: https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/preterm-infant-growth-tools
- AAP corrected age: https://www.healthychildren.org/English/ages-stages/baby/preemie/pages/Corrected-Age-For-Preemies.aspx
- CDC milestone checklists: https://www.cdc.gov/act-early/resources/milestones-checklist-by-age.html
- CDC monitoring/screening: https://www.cdc.gov/act-early/about/developmental-monitoring-and-screening.html
- Indonesia Buku KIA: https://kesprimkom.kemkes.go.id/konten/146/143/0/buku-kesehatan-ibu-dan-anak-kia
