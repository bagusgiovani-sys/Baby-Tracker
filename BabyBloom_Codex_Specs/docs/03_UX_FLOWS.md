# 03 — UX / Screen-by-Screen Design Specification

## Design system / interaction rules
- **Personality:** warm, calm, supportive, modern; avoid childish illustration overload, guilt or scary health scores.
- **Visual tokens:** muted ivory canvas, soft blue/peach/seafoam accents, dark ink typography. Contrast WCAG AA; never depend on color alone.
- **Accessibility:** minimum 44x44pt tap targets, screen reader labels, dynamic font sizes, keyboard safety, accessible charts and forms, error messages next to fields.
- **Language:** `id-ID` default, `en` alternative. Copy is natural Indonesian (e.g. "Catat ASI", "Ganti popok", "Tidur dimulai").
- **No unexplained acronyms:** display "BAB/Pup" and "BAK/Pipis"; don't show "BS" by default.
- **Date format:** localized day/month/year; local IANA timezone stored per baby, not just `+07:00`. Show date line in baby timezone; optional override with explanation.
- **Partial data:** placeholder `Belum dicatat`, not `0`, when no log exists. Summaries say "berdasarkan catatan yang tersedia".
- **Buttons:** every screen has working save/cancel; network status and errors are visible. No dummy CTA in production.
- **Safety:** do not block access to urgent guidance behind a modal, consent marketing form, or paywall.

## IA / navigation
Bottom tabs (5): `Hari Ini`, `Riwayat`, `Pertumbuhan`, `Perkembangan`, `Kesehatan`.
Settings + baby-switch in profile header. Global floating `+ Catat` opens compact bottom sheet with icons: ASI/Susu, Popok, Tidur, MPASI (if enabled), Suplemen/Obat, Gejala, Mood/Aktivitas, Menu Mama (if opted in).

## Onboarding flow (F1)
1. Welcome + explicit non-medical disclaimer link; choose language.
2. Authenticate via passwordless email or supported identity provider. Email login link must work via deep links.
3. Data protection / parental consent explanation: purposes, processing and sharing, revocable permissions, exports/deletion; require explicit guardian confirmation and terms version.
4. Baby nickname and date of birth (required), baby's timezone default device suggestion (editable), gestational age or due date (optional), chart reference sex (optional; required only for sex-specific WHO charts), optional birth measurements; no full legal baby name required.
5. Choose relevant activities and whether MPASI has started; explain solids typically ~6mo, not required for younger infants.
6. Prompt to invite additional caregiver (skip allowed).
7. Open populated **empty state** (not synthetic fake stats).

## Today / Hari Ini (F2)
Header: baby nickname, age in months/days, corrected-age indication if preterm, selected day, data sync indicator.
- Four 2x2 summary tiles: Feeding (number logged), Wet diapers, Sleep (recorded hours), BAB (count).
- Quickly add log buttons: ASI/Susu, Popok, Tidur, MPASI conditional.
- Timer card if active breastfeeding/sleep entry; ending timer saves with `ended_at`.
- Recent timeline: icon, time, concise details, editor identity optionally; tap detail to edit.
- Check-in card `Check-in harian` only once per baby local date; progress and recap.
- Insights section: observational weekly history only if enough entered data; no "healthy/unhealthy" labels.
- `Belum ada catatan` for empty view and button to log.

## Quick log flows (F3)
**Feeding:** choose direct breast / bottle. Direct: start timer, optional breast side, Stop & save; bottle: type + consumed mL (optional) + save. Side switch should record side-segment durations if implemented; v1 may store one session side `both` without fabricated segments.
**Diaper:** choose Pipis / Pup / Keduanya / Kering; if pup reveal color/texture/blood/mucus/amount optional; timestamp default now; save. If no pup fields entered, still valid dirty event.
**Sleep:** Tap `Mulai tidur` creates active record; `Bangun` stops; backdated manual sleep entry possible. Concurrent caregivers see current timer and ownership. App restart must preserve timer start.
**MPASI:** active only when user enables; list ingredients optional; offered/consumed can be unknown; optional `catat gejala terkait` opens new symptom log with link.
**Symptoms:** options with clear plain-language descriptions, temperature if measured, time/site; serious choices immediately display safety message without preventing save.
**Supplements:** single dose event; needs value + unit when `given`; no recommended amount.
**Mood/activity:** mood and/or activity, duration optional.
**Menu Mama:** optional private diary via explicit feature opt-in.

## History / Riwayat (F4)
Timeline filter by calendar day + event type; search by text on device if available, pagination from backend. Swipe action edit/delete with confirmation. Show `ditambah`, `diubah`, `dihapus` appropriately and sync states. For events another caregiver edited concurrently, present clear conflict choice (review theirs/mine), preserving audit record.

## Daily check-in (F5)
User may begin at any time; short 4–6 questions, prefilled counts nearby but questions are not auto-answered. Each can be `Lewati / Tidak yakin`. Follow-up for changed overall condition, reduced feeding/wet diapers, new symptoms; if yes allow `Catat gejala`. Completion screen reads `Check-in tersimpan` rather than `Bayi sehat`; show parent question note. A missed check-in is not a red alert. Daily notifications OFF by default, opt-in; no blame/streaks.

## Growth (F6)
Subtabs Weight, Length, Head, Chart (Chart hidden or "pending verification" until clinical validated), `+ Ukuran`. Each record: value/unit/date/source (home/posyandu/puskesmas/clinic)/confidence and notes. Show point markers with exact dates, sources, reference chart label and data version if enabled. Warn for implausible values as **possible entry error** (confirm) instead of silently reject, except hard physical impossibilities. Do not calculate "needs medical attention" simply from one observation.

## Development (F7)
Age bracket list; milestone checklists from approved/versioned content with statuses `Sudah`, `Belum`, `Tidak yakin`. Age-specific current list (using chronological or corrected age context appropriately). Each item offers neutral explanation and source. On concern/loss of previously acquired skills, encourage discussing with pediatrician; do not diagnose.

## Health (F8)
Tabs `Gejala`, `Suplemen/Obat`, `Imunisasi`, `Kunjungan`. Vaccine history supports manually recording received dose; no assumed completion status. Appointment history supports questions to ask doctor. Export: choose last 7 days/30 days/custom, modules, redacted baby nickname, PDF/CSV; generate using authenticated, expiring URL and clear sharing consent.

## Family and account (F9)
Owner sees invite emails with role (`editor` or `viewer`) and expiry, revoke actions, access log. Editor cannot delete baby/account. Viewer cannot mutate. Child data export and deletion available to owner with reauth. Maternal food section has separate visibility selector (author only by default); include privacy explanation.

## UX state matrix
Every network-dependent screen must handle `initial loading`, `empty`, `offline`, `queued`, `syncing`, `synced`, `failed`, `unauthorized`, `server error`; critical date math works offline. On reauthorization failure, remove data from unauthorized device local cache after safe account state transition without exposing it to next user.

## Screen acceptance examples
- Parent chooses "Pup", leaves optional description empty, and saves successfully.
- MPASI not visible for an infant who has not enabled solids; parents can manually enable if clinically appropriate.
- Parent sees old saved feeding record offline with `Belum tersinkron`, not a misleading green check.
- Parent chooses a concerning symptom and sees immediate emergency-relevant guidance, not a waiting spinner.
- Weight chart empty state contains no invented percentiles.
