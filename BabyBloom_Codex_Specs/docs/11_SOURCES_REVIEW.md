# 11 — Evidence References & Clinical Review Register

**Checked:** 2026-10-13. These are sources for the **design**, not an endorsement/approval of the app. Verify guidance and any localized translation again at release.

## Core sources
| Area | Authority | Relevant verified link | Use / caveat |
|---|---|---|---|
| WHO growth | WHO | https://www.who.int/tools/child-growth-standards | Official charts and indicator definitions |
| Calculations | WHO | https://www.who.int/toolkits/child-growth-standards/software | Official anthropometric software/R tooling; calculations require parity tests |
| Term infancy growth | AAP | https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/term-infant-growth-tools/ | WHO recommended for 0–2y term infants |
| Preterm growth | AAP | https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/preterm-infant-growth-tools | Fenton preterm reference; clinical policy needed |
| Preterm corrected age | AAP | https://www.healthychildren.org/English/ages-stages/baby/preemie/pages/Corrected-Age-For-Preemies.aspx | Corrected-age explanation for development |
| Development | CDC | https://www.cdc.gov/act-early/resources/milestones-checklist-by-age.html | Age-based milestone lists; check reuse rights |
| Monitoring vs screening | CDC | https://www.cdc.gov/act-early/about/developmental-monitoring-and-screening.html | Milestone checks are not diagnostic screens |
| Safe sleep | AAP | https://www.aap.org/en/patient-care/safe-sleep/ | Back sleeping and flat, clear sleep surface |
| Fever/urgency | AAP / HealthyChildren | https://www.healthychildren.org/english/health-issues/conditions/fever/pages/when-to-call-the-pediatrician.aspx | <3 months and 38°C: immediate medical contact, measurement site matters |
| Temperature methods | AAP / HealthyChildren | https://www.healthychildren.org/english/health-issues/conditions/fever/pages/fever-and-your-baby.aspx | Rectal reference for infants, nuances on sites |
| Complementary foods | CDC | https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html | Solids around six months and readiness |
| Infant stool scale | PubMed / clinical paper | https://pubmed.ncbi.nlm.nih.gov/30672767/ | Bristol unsuitable for diapered infants; BITSS is researched; photo rights needed |
| Indonesia Buku KIA | Kemenkes | https://kesprimkom.kemkes.go.id/konten/146/143/0/buku-kesehatan-ibu-dan-anak-kia | 2024 Buku KIA, check latest clinical program at release |
| Indonesia privacy | Official BPK regulation portal | https://peraturan.bpk.go.id/Details/229798/uu-no-27- | UU 27/2022, child/health data sensitive |

## No unsourced claims policy
- If source link unavailable or published guidance conflicts, do not invent numbers. Flag as `REQUIRES_REVIEW`.
- Explicitly distinguish recommendation, clinical guidance, app UX preference and proprietary product rule.
- Update source version + document date; do not silently modify existing historical clinical results.
- Keep reviewer records and sign-off for each published clinical rule and translated message.

## Clinical sign-off template (to fill, not pre-approved)
| Component | Reviewer & credentials | Source/version | Status | Review date | Change request |
|---|---|---|---|---|---|
| Daily care copy | TBD | TBD | REQUIRES_REVIEW | — | — |
| Fever and emergency prompts | TBD pediatrician | AAP + Indonesia review | REQUIRES_REVIEW | — | — |
| Feeding / MPASI / maternal diet | TBD pediatric nutrition / lactation | CDC / WHO | REQUIRES_REVIEW | — | — |
| WHO calculations and charts | TBD pediatric growth specialist | WHO datasets | REQUIRES_REVIEW | — | — |
| Preterm corrected-age routing | TBD neonatologist | AAP/preterm references | REQUIRES_REVIEW | — | — |
| Milestones and localization | TBD developmental pediatrician | CDC | REQUIRES_REVIEW | — | — |
| Vaccination schedule and catch-up | TBD Indonesia pediatrician | Latest Kemenkes | REQUIRES_REVIEW | — | — |
| PDP consent/compliance | TBD Indonesia privacy counsel | UU PDP + regulations | REQUIRES_REVIEW | — | — |

## Known open issues for domain review
- Exact handling of neonatal hypothermia, fever measured axillary/tympanic/temporal, clinical instructions by age and country.
- Clinical protocol for feeding/diaper concerns and high-risk newborns; do not auto-triage with arbitrary count thresholds.
- WHO reference-age calculation and thresholds for preterm, including special neonatal charts and transition.
- CDC milestone localization/licensing and correction of age handling.
- Current vaccination schedule per province/country and per-dose history/catch-up.
- Who receives access to maternal diet information in shared households.
