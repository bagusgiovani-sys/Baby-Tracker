# 08 — Privacy, Security, Consent, Governance

## Data sensitivity
The app processes child-related and health information. Indonesia's UU No. 27 Tahun 2022 (Pelindungan Data Pribadi / PDP Law) categorizes child data and health data as specific personal data. Implement privacy-by-design and obtain independent Indonesian legal counsel review, including rules for guardian consent, processor/controller roles, cross-border data transfer, data subject rights, breach handling, retention and processor agreements. This spec is not legal advice.

Reference: https://peraturan.bpk.go.id/Details/229798/uu-no-27-

## Data map
| Type | Examples | Default disclosure |
|---|---|---|
| Account | caregiver email, locale | account owner only |
| Infant profile | nickname, DOB, gestational age, chart sex | baby authorized members |
| Care events | feeds, diapers, sleep, symptoms, medication | baby authorized members |
| Medical history | growth, vaccines, appointments | baby authorized members |
| Maternal diary | menu mama, private notes | **author only** unless opt-in share |
| Media | rash photo, diaper photo (opt-in future) | authorized baby members; private storage |
| Access logs | exports, invitations, membership change | owner / authorized compliance operators |
| Analytics | aggregate nonsensitive event counts only | never raw health data |

## Required controls before public beta
1. Explicit guardian consent with policy version and purpose scope; withdrawal/deletion request workflow; consent not bundled with marketing.
2. Server-enforced row-level security for every baby-owned table, including join tables and export actions.
3. Least privilege: owner/editor/viewer; invitation expiry, revocation and event audit.
4. No production secrets in Expo client; use publishable key and RLS, server keys only behind secure trusted runtime.
5. TLS in transit, encrypted production databases/storage and secure backups, platform secure store for auth tokens; local SQLite health-data encryption/OS storage threat model documented and tested.
6. Prevent screen exposure after account switch, revoked membership or app lock; clear cache on confirmed revocation while preserving safe local recovery only for currently authorized users.
7. SQL injection and untrusted text handled by parameterized queries and escaped rendering; strict upload file types, content size and virus scanning if enabled.
8. Retention schedule / deletion: remove private attachments and cached logs in a documented deletion process. Clarify backup purge timelines, legal retention and data subject rights in privacy notice.
9. Data export behind re-auth and authorization. Signed URLs short lived; audit export and downloads where feasible.
10. Monitoring avoids PII/PHI in crash logs, analytics and support tickets. Use redaction unit tests.
11. Rate limiting and abuse protections for login, OTP, invitation, attachment upload, exports.
12. Supply chain checks, lockfile, least privileged CI credentials, separated production/staging, secret scanning.
13. Penetration/privacy review and incident-response runbook before production.

## Authorization matrix
| Operation | Owner | Editor | Viewer | Outsider |
|---|---|---|---|---|
| Read baby logs | yes | yes | yes | no |
| Add/edit own or team logs | yes | yes | no | no |
| Record growth/history | yes | yes | no | no |
| Export baby's data | yes | configurable on consent | no by default | no |
| Invite/revoke caregiver | yes | no | no | no |
| Delete baby | yes + reauth | no | no | no |
| Change policy consent | own consent | own consent | own consent | no |
| Read mother's food journal | author; shared if opted-in | author; shared if opted-in | only explicitly shared with role | no |

Require backend checking for every operation. Individual caregivers can view and update their **own** user profile, not others' emails or personal notes.

## Consent and trust UX
- Explain what data are collected, why and who sees it, and how to manage access.
- Avoid prechecked marketing opt-ins.
- Public-facing copy must never claim formal expert approval until formally obtained.
- Allow export and deletion; users can remove optional modules (with transparent retention consequences).
- Offer redaction options on report export.

## Security QA
- Database tests: outsider cannot SELECT/INSERT/UPDATE/DELETE; viewer cannot write; revoked cannot access; cannot change `baby_id` to access another family; server functions don't bypass intended checks; maternal private records remain private.
- API tests: malformed event payloads rejected, rate limits enforced, replay deduplicated, guessed UUID cannot leak data, signed URL expired after TTL, cross-tenant attachments inaccessible.
- Device tests: offline cache partitioned by account, tokens protected, sign-out behavior documented, no images/free text in crash events, export cleanup.
- People/process tests: ensure no child details or records in beta screenshots, demos, GitHub issues, build artifacts or public telemetry.

## Launch release gate
☐ Privacy notice and guardian consent counsel-reviewed
☐ RLS penetration/integration tests passed
☐ Data deletion and backup schedule documented
☐ Access logging and incident response owner named
☐ Local storage encryption/security reviewed
☐ Export/download sharing threat model approved
☐ Clinical/legal label and sign-off complete
