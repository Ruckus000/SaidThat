# Testing Strategy

**Date:** 2026-07-18

---

## 1. Goals

- Prove game-engine correctness without devices  
- Prove UX flows on iOS/Android  
- Prove motion state machine with fixtures  
- Prove content packages validate  
- Prove RLS/policies  
- Ship with smoke confidence  

---

## 2. Layers and tools

| Layer | Tools |
|---|---|
| Unit | Jest / Vitest for `packages/game-engine`, validation, scoring |
| Component | React Native Testing Library |
| Navigation | RNTL + Expo Router testing patterns |
| Motion | Fixture-driven unit tests of state machine; mock `DeviceMotion` |
| Device | Manual matrix + internal TestFlight/Play |
| E2E mobile | **Maestro** (pragmatic) or Detox if team prefers |
| Admin E2E | Playwright |
| Backend | pgTAP / Supabase local tests; Edge Function tests |
| DB policies | Supabase RLS tests (anon vs editor) |
| A11y | axe where available; VoiceOver/TalkBack scripts |
| Offline | Airplane mode device tests |
| Performance | React Native perf monitor; startup traces |
| Lifecycle | Background/foreground mid-round |
| Analytics | Debug sink asserting event names/props |
| Content integrity | CI Zod validation on all deck JSON |
| Multiplayer | Deferred contract tests |
| Store smoke | Install, play one round, purchase sandbox (Phase 2) |

---

## 3. Motion without relying only on physical devices

1. Record real DeviceMotion JSON from QA phones  
2. Replay into state machine in CI  
3. Property tests: never double-emit; cooldown respected  
4. Manual device checklist per OS major version  

---

## 4. Minimum CI gates (Phase 1)

- Unit + validation packages  
- Typecheck  
- Lint  
- Deck fixture validation  
- Admin Playwright smoke  
- No E2E blocking initially; nightly Maestro  

---

## 5. Test plan highlights

### Gameplay
- Scoring edge cases (skip, streak, timer expiry)  
- Deck sampling uniqueness within round  

### Offline
- Play full round offline  
- Tombstone applied after sync  

### A11y
- Complete round in tap mode with TalkBack/VoiceOver  

### Security
- Anon cannot read editorial notes  
- Report rate limit  

### Release smoke
- Cold start → download deck → forehead tap-mode round → review → report  

---

## 6. Ownership

- Engineers own unit/CI  
- QA owns device matrix + exploratory party tests  
- Editors own content QA checklist before publish  
