# SaidThat (working product: Did They Tweet That?)

> Engineering package id: **SaidThat** (`com.saidthat.app` provisional). Store brand still pending trademark counsel.  
> Party game: decide whether a public figure **really said/posted** a statement.

**Project status:** Planning + DesignOps strategy review. **Application implementation is gated** (`AGENTS.md` / LaunchPad DesignOps). A partial `apps/mobile` Expo stub exists from an early scaffold attempt — do not expand it until the implementation gate is signed.

**Repository-control status:** Local DesignOps checks and tracked Git hooks are fail-closed. GitHub Actions displays the policy result, but this private repository's current GitHub plan does not enforce branch protection; use feature branches and pull requests, then verify the workflow before merge. See [DesignOps enforcement](tools/designops/README.md).

**Phase 0 content (planning):** researched card candidates live under [`docs/content/`](docs/content/) with sources. Analytics for first playable build: **debug event log only** (no PostHog yet).

---

## What this is

A Heads Up–inspired social party game. MVP: local forehead play + pass-and-play, offline editorial decks, clear fabrication labels. See [`docs/architecture.md`](docs/architecture.md).

**Recommendation:** Conditional go — validate fun (Phase 0) and legal patterns before scaling.

---

## Recommended stack

| Area | Choice |
|---|---|
| Mobile | Expo (dev client) + TypeScript + Expo Router |
| State | Zustand (session); TanStack Query only Phase 1+ |
| Local data | Raw expo-sqlite (Phase 1); Phase 0 may skip |
| Motion / haptics | expo-sensors, expo-haptics |
| Content (Phase 0–1) | PR-reviewed JSON — no admin CMS yet |
| Backend | None in Phase 0; Supabase in Phase 1+ |
| Analytics | Debug log first; PostHog later |
| Errors | Sentry before external TestFlight |

---

## Document index

| Doc | Purpose |
|---|---|
| [docs/00-full-product-plan.md](docs/00-full-product-plan.md) | Ordered master brief |
| [docs/architecture.md](docs/architecture.md) | Phase 0/1 architecture (revised) |
| [docs/content/](docs/content/) | Deck schema + sourced Phase 0 candidates |
| [docs/product-brief.md](docs/product-brief.md) | Product strategy |
| [docs/market-research.md](docs/market-research.md) | Market & competitors |
| [docs/legal-and-platform-risks.md](docs/legal-and-platform-risks.md) | Legal/policy risks (not advice) |
| [docs/gameplay-spec.md](docs/gameplay-spec.md) | Formats, scoring |
| [docs/ux-spec.md](docs/ux-spec.md) | Screens & a11y |
| [docs/data-model.md](docs/data-model.md) | Schema |
| [docs/content-operations.md](docs/content-operations.md) | Editorial workflow |
| [docs/security-and-moderation.md](docs/security-and-moderation.md) | Security |
| [docs/testing-strategy.md](docs/testing-strategy.md) | QA |
| [docs/analytics-plan.md](docs/analytics-plan.md) | Events |
| [docs/roadmap.md](docs/roadmap.md) | Phases |
| [docs/backlog.md](docs/backlog.md) | Backlog |
| [docs/risk-register.md](docs/risk-register.md) | Risks |
| [docs/decision-log.md](docs/decision-log.md) | ADRs |
| [docs/open-questions.md](docs/open-questions.md) | Open questions |
| [AGENTS.md](AGENTS.md) | DesignOps agent gate |

---

## Prerequisites before writing more production code

1. **Clear DesignOps implementation gate** (signed strategy/direction approval per `AGENTS.md`).  
2. Counsel kickoff — trademark + fabrication/publicity.  
3. Editorial review of [`docs/content/phase0-deck.candidates.json`](docs/content/phase0-deck.candidates.json).  
4. Phase 0 success bar agreed.

Then: monorepo packages + Expo Router Home shell + Zod validation of the deck (still no full game loop until you greenlight it).

---

## License / notices

Product naming and any social-platform trademarks remain third-party property. Planning documents and content candidates are for internal editorial use.
