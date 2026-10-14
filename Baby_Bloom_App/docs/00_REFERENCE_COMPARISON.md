# 00 — Mapping the Friend's Infant Log to BabyBloom

The user-provided log is a sample for a particular baby named **Moses**. It is not a standardized medical checklist.

| Friend's header | Friend's fields | App label | V1 action |
|---|---|---|---|
| Defekasi Pup | Jam, BS, tekstur, warna, tenggelam/mengambang | **BAB / Pup** | Keep time, consistency and color; add amount, blood/mucus/unsure. BS unclear; Bristol is unsuited to diapered infants; sinking/floating hidden and not used for any clinical decision. |
| Menu Moses | Jam, menu, porsi | **Menu Bayi / MPASI** | Keep; add ingredients, texture, approximate offered/eaten portion and optional new/allergen food. Activate when solids begin (usually around 6mo). |
| Menu Mama | Menu makanan/snack | **Menu Mama** | Optional private caregiver diary; never impose on breastfeeding mothers or infer causation. |
| Suplemen Moses | Jam, suplemen, dosis | **Suplemen / Obat Bayi** | Keep; add prescribed unit and given/missed/partial status. No dose advice. |
| Pola tidur | Jam, durasi | **Tidur** | Keep; auto-compute duration from start/end, nap/night optional. |
| Respon | ruam kulit, kentut, sendawa, bersin, warna kulit | **Respon & Gejala** | Keep as optional symptom observations; include temperature + method if measured, vomiting, poor feeding, breathing concern. Normal farts/burps/sneezes not required. |
| Mood & aktivitas | (not yet defined) | **Mood & Aktivitas** | Mood, activities, optional durations/notes; no health scoring. |

## Added categories absent in friend's list
1. **ASI / Susu Formula**: direct breastfeeding and bottle feed logs, timing, side, duration, known mL only for bottle.
2. **BAK / Pipis**: wet diapers, time and optionally unusual urine appearance; crucial context for newborn care.
3. **Check-in Harian**: baby usual/different, feeding versus usual, wet diapers versus usual, sleep concern, new symptoms, parent questions. This is short and optional, not a second manual summary.

## Intentionally non-daily
Growth: weight, recumbent length, head circumference at measured appointments. Developmental milestones at age-appropriate times. Vaccinations on administration dates. Clinical appointments and records when applicable.

## Do not confuse labels
- "BS" may mean Bristol Stool Scale but **is not defined** by friend; no hard-coded automatic assumption.
- "Menu Moses" is just that baby's food menu; for generalized app don't use Moses as field identifier.
- "Tenggelam/mengambang" usually refers to stool floating/sinking in toilet water; not a routine infant-diaper observation.
- "Tidak diisi" (not entered) is different from "tidak ada" (explicitly observed absent).
