# Did They Tweet That?

> Working title for a React Native party game: decide whether a public figure **really said/posted** a statement.

**Project status:** Planning complete. **No application code yet.** Do not treat docs as legal advice.

---

## What this is

A Heads Up–inspired social party game. Players see an attributed statement and choose **They did** vs **They did not**. MVP focuses on local forehead play + pass-and-play, offline editorial decks, and clear labeling of fabricated cards. Realtime multiplayer, live X/Twitter API dependency, and public UGC are explicitly out of MVP scope.

**Recommendation:** Conditional go — validate fun (Phase 0) and legal patterns before scaling.

---

## Recommended stack

| Area | Choice |
|---|---|
| Mobile | Expo (dev client) + TypeScript + Expo Router |
| State | Zustand (session) + TanStack Query (remote) |
| Local data | expo-sqlite |
| Motion / haptics | expo-sensors, expo-haptics |
| Backend | Supabase (Postgres, Storage, Edge Functions, RLS) |
| Admin | Next.js |
| Analytics / flags | PostHog |
| Errors | Sentry |
| Payments (later) | RevenueCat |

---

## Document index

| Doc | Purpose |
|---|---|
| [docs/00-full-product-plan.md](docs/00-full-product-plan.md) | Ordered master brief (sections 1–28) |
| [docs/product-brief.md](docs/product-brief.md) | Executive product strategy |
| [docs/market-research.md](docs/market-research.md) | Market & competitors + citations |
| [docs/legal-and-platform-risks.md](docs/legal-and-platform-risks.md) | Legal/policy risks (not advice) |
| [docs/gameplay-spec.md](docs/gameplay-spec.md) | Formats, scoring, modes |
| [docs/ux-spec.md](docs/ux-spec.md) | Screens, a11y, visual direction |
| [docs/architecture.md](docs/architecture.md) | System design + motion pseudocode |
| [docs/data-model.md](docs/data-model.md) | Schema |
| [docs/content-operations.md](docs/content-operations.md) | Editorial workflow |
| [docs/security-and-moderation.md](docs/security-and-moderation.md) | Security & moderation |
| [docs/testing-strategy.md](docs/testing-strategy.md) | QA plan |
| [docs/analytics-plan.md](docs/analytics-plan.md) | Events & north-star metric |
| [docs/roadmap.md](docs/roadmap.md) | Phased delivery |
| [docs/backlog.md](docs/backlog.md) | Engineering backlog |
| [docs/risk-register.md](docs/risk-register.md) | Ranked risks |
| [docs/decision-log.md](docs/decision-log.md) | ADRs |
| [docs/open-questions.md](docs/open-questions.md) | Unresolved decisions |

---

## Prerequisites before writing production code

1. **Counsel kickoff** — trademark on product/mode name; fabrication & publicity memo.  
2. **Master brand direction** — platform-neutral store name preferred.  
3. **Editorial owner** + Phase 0 card set (50–150) under safety rules.  
4. **Phase 0 success bar agreed** — proposed: unaided 2+ rounds in ≥70% of groups; strong rematch desire.  
5. **Apple/Google developer accounts** ready for later device builds.  
6. **No scraping / no client X API** assumption accepted by stakeholders.

When those are in motion, start implementation with: monorepo scaffold → `game-engine` + tap-mode round → bundled deck → analytics → motion → Supabase reports.

---

## Exact first ten implementation tasks (after prerequisites)

1. Scaffold Expo TS app + monorepo packages (`types`, `game-engine`, `content-validation`).  
2. Implement scoring + round state machine (unit tested).  
3. Build Home → Deck → Countdown → Active Card (tap) → Results → Review.  
4. Ship bundled Phase 0 deck JSON validated by Zod in CI.  
5. Add settings: timer, haptics, tap-only, reduced motion.  
6. Integrate Sentry + PostHog with MVP event taxonomy.  
7. Implement motion state machine behind flag; default tap in VO.  
8. Add pass-and-play local players + scoreboard.  
9. Stand up Supabase: manifests, reports, RLS; wire report flow.  
10. EAS preview builds + device playtest checklist.

---

## License / notices

Product naming and any social-platform trademarks remain third-party property. This repository currently contains planning documents only.
