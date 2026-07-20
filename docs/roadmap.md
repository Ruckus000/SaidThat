# Delivery Roadmap

> Historical product roadmap. The current owner-authorized execution scope is the local-first fixture MVP in [`docs/mvp-build-queue.md`](mvp-build-queue.md); its research and production-release dependencies are not build prerequisites for that scope.

**Date:** 2026-07-18

---

## Phase 0 — Validation prototype

**User value:** Learn if groups laugh and rematch.

**Features:** One local mode (forehead + tap), one deck (50–150 cards), basic scoring, local analytics/debug log, no accounts, no multiplayer.

**Technical work:** Expo app shell, game engine package, motion harness, SQLite optional (can ship JSON in bundle), no CMS required (static deck).

**Dependencies:** Editorial card writing; 8–12 playtest groups.

**Risks:** False confidence from friends; motion flakiness.

**Exit criteria:** ≥70% groups complete 2+ rounds unaided; rematch desire high; control usability ≥80%.

**Evidence to proceed:** Playtest notes + recorded metrics; counsel preliminary read on fabrication labeling.

---

## Phase 1 — MVP

**User value:** Replayable party nights with multiple decks offline.

**Features:** Formats A+B, 3–5 decks, offline packages, Supabase manifest, report flow, PostHog, Sentry, share results, remote kill-switch.

**Technical work:** Monorepo, admin CMS light, packaging pipeline, RLS, EAS builds.

**Dependencies:** Phase 0 pass; trademark direction; content volume.

**Risks:** Content ops bottleneck; store review.

**Exit criteria:** Rematch ≥40%; crash-free ≥99.5%; takedown path works; soft launch without policy incident.

---

## Phase 2 — Retention & monetization

**User value:** Reasons to return; pay for more fun.

**Features:** Accounts optional, daily deck, paid packs (RevenueCat), streaks light, push optional, personalization light.

**Exit criteria:** Organic retention + pack conversion without harming rematch rate.

---

## Phase 3 — Multiplayer & platform expansion

**User value:** Cross-device rooms; creator decks.

**Features:** Room codes, realtime answers, friend challenges, web companion, private custom decks → careful public creator program.

**Exit criteria:** Multiplayer completion rate healthy; moderation SLAs held; infra cost acceptable.

---

## Performance targets (all phases)

| Metric | Target |
|---|---|
| Cold start | &lt; 2.5s |
| First playable (cached) | &lt; 5s |
| FPS | 60 |
| Sensor accept path | &lt; 50ms compute + configured debounce |
| Offline launch | Full party play |
| Deck size | &lt; 1.5MB / 150 cards |
| Memory | No growth leaks across 10 rematches |
| Crash-free | ≥ 99.5% |
| Manifest p95 | &lt; 300ms |

---

## Staffing sketch (small team)

- 1 RN engineer, 1 full-stack, 1 designer (fractional), 1 PM/content lead, counsel on retainer, QA fractional.
