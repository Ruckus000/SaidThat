# Security and Moderation Model

**Date:** 2026-07-18

---

## 1. Threat model (MVP)

| Threat | Severity | Mitigation |
|---|---|---|
| Malicious fake cards implying real statements | High | Two-person editorial; labeling; takedown |
| API abuse on report endpoints | Medium | Rate limit, device attestation light |
| Admin account takeover | High | MFA, least privilege, audit logs |
| Tampered deck packages | High | Checksums, HTTPS, signing optional Phase 2 |
| UGC abuse | High later | Defer public UGC |
| Analytics PII leakage | Medium | card_id only; no raw IMU |
| Secrets in client | High | No service keys in app |

---

## 2. Authentication & authorization

- Phase 0–1 players: **anonymous device UUID** in secure storage  
- Editors: Supabase Auth email + MFA; `profiles.role` ∈ editor|moderator|admin  
- RLS examples:
  - Public read of published deck manifests only  
  - Cards not directly world-readable if sensitive notes exist—ship via packages  
  - Reports: insert by anyone rate-limited; read by moderator+  
  - Editorial tables: editor+  

---

## 3. Row-level security principles

- Default deny  
- Separate `service_role` for packager Edge Functions  
- Never expose `fact_check_notes` or source snapshots to anon  

---

## 4. Rate limits & abuse

- Report submit: e.g. 10/hour/device  
- Manifest fetch: CDN cached  
- Admin login lockout  

---

## 5. Input validation

- Zod schemas shared in `packages/content-validation`  
- Max statement length (e.g. 280–500 chars for MVP UX)  
- Strip control characters  

---

## 6. Secure storage

- Device ID, flags in Expo SecureStore  
- Deck files in app document sandbox  
- No plaintext secrets  

---

## 7. Secrets management

- EAS secrets for mobile  
- Supabase vault / hosted env for Edge  
- Rotate on staff offboarding  

---

## 8. Moderation workflows

### User report SLA
- Ack automated immediate  
- Human triage &lt; 48h Phase 1; &lt; 24h for legal/harm  

### Actions
- Hide card locally immediately after report (optional user setting)  
- Global tombstone  
- Deck unpublish  
- Ban editor (admin)  

### Audit
Every approve/publish/tombstone → `audit_logs`

---

## 9. UGC risks (Phase 3+)

Require: ToS acceptance, report/block, filters, age gate, private default, no viral public feed initially.

---

## 10. Account deletion & retention

- Phase 2+: delete auth user → cascade profile; anonymize reports  
- Analytics retention: 14 months default or per policy  
- Editorial evidence snapshots: restrict access; retention policy with counsel  

---

## 11. Privacy

- Privacy policy before analytics opt-in where required  
- Motion data on-device only  
- Children’s directive: 13+/17+ store rating; no under-13 targeting  
