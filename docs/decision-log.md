# Architecture Decision Records

**Date:** 2026-07-18

---

## ADR-001 — Party game first, not UGC platform

- **Decision:** Position and build as a local party game.  
- **Context:** Concept could become trivia, news literacy, or UGC.  
- **Alternatives:** Solo daily trivia; UGC meme platform; news fact-check app.  
- **Why:** Highest fun density; lowest moderation load; proven category analogs.  
- **Consequences:** Retention depends on editorial decks.  
- **Change if:** Playtests show solo preference or B2B education demand.

---

## ADR-002 — Format A + B in MVP; multiplayer later

- **Decision:** Ship forehead + pass-and-play; defer rooms.  
- **Context:** Three formats proposed.  
- **Alternatives:** Multiplayer-only; pass-and-play only.  
- **Why:** Differentiator + accessibility; realtime is costly pre-validation.  
- **Consequences:** No cross-device play at launch.  
- **Change if:** Phase 0 shows forehead fails and groups demand phones-per-player.

---

## ADR-003 — Real or Fake as only mode in MVP

- **Decision:** Single mode.  
- **Alternatives:** Who Posted It; Bluff; AI-or-Real.  
- **Why:** Cognitive simplicity for forehead readability.  
- **Consequences:** Less variety until Phase 2.  
- **Change if:** Counsel blocks fabrications—pivot to Who Said It with licensed quotes.

---

## ADR-004 — No live X API in client for MVP

- **Decision:** Editorial packages; no runtime X dependency.  
- **Context:** 2026 pay-per-use API + display/deletion constraints.  
- **Alternatives:** Hydrate tweets live; unofficial scrapers.  
- **Why:** Cost, ToS, offline party needs, deletion SLA.  
- **Consequences:** Cannot market as “live Twitter mirror.”  
- **Change if:** X offers licensed game partnership / affordable redistributable corpus.

---

## ADR-005 — Platform-neutral master brand

- **Decision:** Do not lock legal entity + store name to “Did They Tweet That?” without clearance.  
- **Context:** Tweet/Twitter mark disputes and X ToS.  
- **Alternatives:** Keep working title through launch.  
- **Why:** Trademark and platform-dependency risk.  
- **Consequences:** Extra branding work.  
- **Change if:** Counsel clears name and X permission obtained (unlikely needed if unused).

---

## ADR-006 — Expo + TypeScript

- **Decision:** Expo (dev client) for mobile.  
- **Alternatives:** Bare RN; Flutter; native.  
- **Why:** Speed to Phase 0/1; sensors/haptics available.  
- **Consequences:** Occasional native escape hatches.  
- **Change if:** Hard blocker native module appears.

---

## ADR-007 — Zustand; TanStack Query only when remote; raw expo-sqlite

- **Decision:** Session state in Zustand. TanStack Query only in Phase 1+ for manifests/reports. Persist with **raw expo-sqlite** (no Drizzle yet). Phase 0 may skip SQLite.  
- **Alternatives:** Redux Toolkit; Drizzle from day one; MMKV only.  
- **Why:** Clear boundaries; avoid ORM/query-client bloat before remote exists.  
- **Change if:** Query/migration pain justifies Drizzle; sync complexity grows.

---

## ADR-008 — Bundled JSON/PR content first; Supabase later; admin CMS deferred

- **Decision:** Phase 0 = bundled deck JSON only (no backend). Phase 1 may add Supabase for manifests/reports. Editorial workflow = PR-reviewed JSON/packages. **No Next.js admin in Phase 0–1.**  
- **Alternatives:** Supabase + Next admin from day one; Firebase.  
- **Why:** Validate fun before CMS/platform work.  
- **Consequences:** Editors use git; fast takedown via PostHog flags + tombstones/manifest when online/updated.  
- **Change if:** Non-eng editors or card volume make PRs untenable after Phase 0 passes.

---

## ADR-009 — PostHog + Sentry; dual kill switches

- **Decision:** PostHog for analytics + remote disable flags; Sentry for crashes. Kill a card/deck if **tombstoned OR flag-disabled** (both layers).  
- **Alternatives:** Amplitude; flags-only; tombstones-only.  
- **Why:** Tombstones work offline after update; flags give fast online override.  
- **Change if:** Cost/privacy dictate self-host; or single source of truth proves simpler in practice.

---

## ADR-010 — No monetization until fun proven

- **Decision:** Free validation through Phase 1 soft launch.  
- **Alternatives:** Paid app day one; ads.  
- **Why:** Avoid confounding rematch metric.  
- **Change if:** Distribution requires paid quality signal (rare).

---

## ADR-011 — Monorepo without admin app until needed

- **Decision:** Monorepo with `apps/mobile` + shared packages (`types`, `game-engine`, `content-validation`, content JSON). **Do not scaffold `apps/admin` until CMS is justified.**  
- **Alternatives:** Polyrepos; scaffold admin empty now.  
- **Why:** Shared validation/engine; avoid dead admin app.  
- **Change if:** Phase 2+ CMS work starts.

---

## ADR-012 — AI-assisted decoy drafting; a named human rewrites and owns every shipped line

**Amended 2026-08-04 (owner decision).** Supersedes the original "no AI drafting" form of this ADR.

- **Decision:** AI may draft decoy text. A named human editor rewrites it, approves it, and owns it; `decoyMethod` records `human` or `ai_assisted`, and an `ai_assisted` card cannot leave `draft` without an owning editor recorded in `editorialNotes`. The two-person approval rule is unchanged and applies to every card naming a real figure.
- **Context:** ROP + store deceptive-media climate. The original ADR forbade AI drafting outright; the owner has accepted the volume/quality tradeoff in exchange for the attribution and ownership controls above.
- **Alternatives:** Brainstorm-only assist (the previous position); unattributed LLM mass generation (rejected — attribution is what makes the rest of the safety model enforceable).
- **Why:** Decoy volume is the binding constraint on deck size, and deck size is what the run-builder needs to stop repeating runs. Ownership is recorded per card rather than assumed per policy.
- **Unchanged by this amendment:** the banned content categories, the reveal labeling that keeps fabricated cards labeled as fabricated, the two-person rule, and the takedown SLA. AI assistance changes who *drafts*, not what may ship.
- **Change if:** attribution or approval data proves unreliable in review, or counsel revises the deceptive-media position.

---

## ADR-013 — Forehead motion is Phase 0 must-have; Reduce Motion ≠ disable tilt

- **Decision:** Ship tilt in Phase 0 with `WAIT_NEUTRAL` state machine; tap/VoiceOver fallbacks. OS Reduce Motion affects animations only, not tilt availability.  
- **Alternatives:** Tap-only Phase 0; tie Reduce Motion to no-motion mode.  
- **Why:** Differentiator must be tested early; Reduce Motion is an animation preference.  
- **Change if:** Device QA shows tilt unusable for target audience.

---

## ADR-014 — On-device authenticity is not secret

- **Decision:** Ship `authenticity` in plaintext deck packages.  
- **Alternatives:** Encrypt answers; server-side reveal only.  
- **Why:** Local party game; anti-cheat adds complexity without product value.  
- **Change if:** Competitive ranked multiplayer requires hidden answers.

---

## ADR-015 — Local DesignOps enforcement with GitHub visibility

- **Decision:** Keep the repository private and use fail-closed local DesignOps enforcement, tracked Git hooks, and GitHub Actions visibility. Do not represent `main` as remotely protected while the current GitHub plan cannot enforce private-repository rulesets or branch protection.
- **Context:** The repository has a trusted reviewer public key in GitHub Actions and a successful DesignOps workflow, but the available GitHub plan cannot make that check, pull requests, or CODEOWNERS server-enforced merge controls.
- **Alternatives:** Make the repository public; upgrade or move to an eligible GitHub plan; claim GitHub Actions alone protects `main`.
- **Why:** Preserve repository privacy and accurately distinguish local controls from remote visibility without incurring a plan or ownership change.
- **Consequences:** A writer with repository access can directly update `main`; contributors must use feature branches, pull requests, local gates/hooks, and inspect the Actions result as operating discipline. CODEOWNERS routes review requests but is not mandatory.
- **Change if:** The repository gains an eligible GitHub plan and branch protection is actually activated for `main`.
