# SaidThat (working product: Did They Tweet That?)

> Engineering package id: **SaidThat** (`com.saidthat.app` provisional). Store brand still pending trademark counsel.  
> Party game: decide whether a public figure **really said/posted** a statement.

**Project status:** Local-first fixture MVP in active development. `apps/mobile` contains the playable Expo baseline: Room Beacon, Private Relay, fixture-only cards, offline report queueing, and deterministic resilience tests. The owner-authorized MVP path permits this scoped work now; see [MVP build status](.designops/mvp-build-status.md) and [the Cursor task queue](docs/mvp-build-queue.md).

**Repository-control status:** Local DesignOps checks and tracked Git hooks are fail-closed. `main` is also remotely protected: the active "Protect main" ruleset requires a pull request and a passing `enforce` check, and blocks force pushes and deletions. It does not require an approving review — that is a process rule this repository imposes on itself, not something GitHub enforces, so a green merge button is not review approval. See [DesignOps enforcement](tools/designops/README.md) and the "Remote GitHub status" section of [AGENTS.md](AGENTS.md).

**Phase 0 content (planning):** researched card candidates live under [`docs/content/`](docs/content/) with sources. Analytics for first playable build: **debug event log only** (no PostHog yet).

---

## What this is

A Heads Up–inspired social party game. MVP: local forehead play + pass-and-play, offline editorial decks, clear fabrication labels. See [`docs/architecture.md`](docs/architecture.md).

**Recommendation:** Conditional go — validate fun (Phase 0) and legal patterns before scaling.

---

## Recommended stack

| Area | Choice |
|---|---|
| Mobile | Expo (dev client) + TypeScript; stage routing in `App.tsx` (Expo Router deferred) |
| State | Pure `gameReducer` via `useReducer` in `apps/mobile` (Zustand deferred) |
| Local data | AsyncStorage report queue + playtest stats (SQLite deferred to Phase 1+) |
| Validation | Pure JS `validateDeck` / `contentRules` (Zod deferred) |
| Motion / haptics | expo-sensors, expo-haptics |
| Content | PR-reviewed JSON via `tools/content-pipeline/` → bundled `deck.generated.js` |
| Backend | None for the local-first MVP; Supabase only when remote reports/manifests exist |
| Analytics | Debug / local playtest export first; PostHog later |
| Errors | Sentry before external TestFlight |

The aspirational Phase 0 stack in older planning docs (Expo Router, Zustand, Zod, SQLite) remains a future option. What shipped is the simpler reducer + stage-switch architecture above.

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

## Building the MVP with Cursor

Read [`AGENTS.md`](AGENTS.md), then [`docs/mvp-build-queue.md`](docs/mvp-build-queue.md). Before app changes, run:

```bash
node tools/designops/enforce.mjs --intent implementation
```

The local-first, fixture-only MVP under `apps/mobile/` is authorized. Do not add paid research, external validation, or signed Direction/Handoff review as an implementation prerequisite. Do not add public-figure cards, accounts, live social integrations, public uploads, or release claims.

For each focused change: run the mobile checks, run DesignOps enforcement, open a PR, complete code and security review, and merge only after both reviews and the policy workflow pass.

---

## License / notices

Product naming and any social-platform trademarks remain third-party property. Planning documents and content candidates are for internal editorial use.
