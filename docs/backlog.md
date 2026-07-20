# Prioritized Engineering Backlog

> Historical long-range backlog. For the current local-first fixture MVP, Cursor must follow [`docs/mvp-build-queue.md`](mvp-build-queue.md). Backend, real-content, analytics, account, and release items below are not currently authorized MVP work.

**Date:** 2026-07-18  
**Priority:** P0 must for Phase 0/1 · P1 should · P2 later  
**Complexity:** S / M / L / XL

---

## Product foundation

| ID | Epic | User story | Description | Acceptance criteria | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| PF-1 | Foundation | As a player I can install a runnable app | Expo TS app boots to Home | iOS+Android launch; TS strict | — | P0 | M | Expo config drift | Smoke install |
| PF-2 | Foundation | As a team we share types | `packages/types` + zod schemas | Schemas used by app+admin | PF-1 | P0 | S | Drift | Contract tests |
| PF-3 | Foundation | As a player I see brand Home | Home CTAs per UX spec | Play/Decks/Settings visible | PF-1 | P0 | S | — | Component |

## Navigation

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| NAV-1 | Navigation | As a player I can move through game flows | Expo Router routes for all MVP screens | Deep links to Home work | PF-1 | P0 | M | Router upgrades | Nav tests |
| NAV-2 | Navigation | As a player I can pause/exit safely | Confirm end-round | No data loss on back | NAV-1 | P0 | S | Android back | E2E |

## Gameplay

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| GP-1 | Gameplay | As a group we can play Real or Fake | Card loop + timer | Round completes; review shows labels | PF-2 | P0 | L | Pace tuning | Unit+E2E |
| GP-2 | Gameplay | As friends we can pass-and-play | Local players + scores | 2–8 players; scoreboard | GP-1 | P0 | M | State bugs | Unit |
| GP-3 | Gameplay | As a player I can rematch | Rematch CTA | New round same deck | GP-1 | P0 | S | — | E2E |

## Motion controls

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| MO-1 | Motion | As a player I can answer by tilt | State machine + sensors | Emits one answer; cooldown works | GP-1 | P0 | L | Device variance | Fixture unit + device |
| MO-2 | Motion | As a player I can use tap-only | First-class fallback | VO forces tap | MO-1 | P0 | S | — | A11y |
| MO-3 | Motion | As a player I can calibrate | Calibration flow | Neutral saved | MO-1 | P1 | M | Bad calib | Device |

## Decks and cards

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| DK-1 | Decks | As a player I can play bundled deck | Phase 0 static deck | 50+ cards validate | PF-2 | P0 | M | Content quality | Schema CI |
| DK-2 | Decks | As a player I can download decks | Manifest + package | Checksum verified; offline play | BE-1 | P0 | L | CDN fails | Offline tests |
| DK-3 | Decks | As a player deleted cards disappear | Tombstones | Removed after sync | DK-2 | P0 | M | Stale cache | Sync tests |

## Scoring

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| SC-1 | Scoring | As a player I get a fair score | Engine package | Matches spec table | PF-2 | P0 | S | Rule changes | Unit |

## Offline storage

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| OF-1 | Offline | As a player I can play without network | SQLite cache | Airplane mode full round | DK-2 | P0 | M | Migration bugs | Offline E2E |
| OF-2 | Offline | As a player reports queue | Outbox | Flush when online | BE-2 | P1 | M | Dup reports | Unit |

## Backend

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| BE-1 | Backend | As the app I can fetch manifests | Supabase + storage | Staging+prod envs | — | P0 | M | RLS misconfig | Policy tests |
| BE-2 | Backend | As a player I can report a card | Report API | Rate limited; admin sees | BE-1 | P0 | M | Spam | Integration |
| BE-3 | Backend | As an editor I can publish decks | Packager function | Semver bump; checksum | ADM-1 | P1 | L | Bad packages | CI validate |

## Admin tooling

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| ADM-1 | Admin | As an editor I can ship cards via PR | JSON decks + Zod CI; **no Next CMS yet** | Invalid decks fail CI; preview in app | PF-2 | P0 | M | Non-git editors | Schema CI |
| ADM-2 | Admin | As a moderator I triage reports | Deferred until Phase 1 API | — | BE-2 | P2 | M | — | — |

## Analytics

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| AN-1 | Analytics | As a PM I see funnel events | PostHog taxonomy | Events match plan | PF-1 | P0 | M | PII leak | Analytics tests |
| AN-2 | Analytics | As a PM I can kill a deck | Feature flag | Flag hides deck | AN-1 | P1 | S | Cache | Manual |

## Accessibility

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| A11Y-1 | A11y | As a VO user I can complete a round | Labels + tap mode | Full round possible | GP-1 | P0 | M | Landscape VO | Device |
| A11Y-2 | A11y | As a user with reduced motion I get calm UI | Respect setting | No confetti/shake | GP-1 | P1 | S | — | Unit |

## Security

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| SEC-1 | Security | As a platform we enforce RLS | Policies | Anon denied notes | BE-1 | P0 | M | Data leak | Policy tests |
| SEC-2 | Security | As an admin I have MFA | Auth policy | Editors MFA | ADM-1 | P1 | S | — | Manual |

## QA / Release

| ID | Epic | User story | Description | AC | Deps | Pri | Cx | Risks | Testing |
|---|---|---|---|---|---|---|---|---|---|
| QA-1 | QA | As a team we have CI | Lint/type/unit/schema | PR gated | PF-1 | P0 | M | Flakes | CI |
| REL-1 | Release | As a team we ship EAS profiles | dev/preview/prod | Build succeeds | PF-1 | P0 | M | Certificates | Build smoke |
| REL-2 | Release | As QA I have store smoke checklist | Doc+script | Run before submit | GP-1 | P1 | S | — | Manual |

---

## Explicitly not backlog yet

Realtime multiplayer, RevenueCat, push, AI decoy generator, public UGC, live X hydration in client.
