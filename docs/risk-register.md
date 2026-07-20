# Risk Register

**Date:** 2026-07-18  
**Scale:** Likelihood / Impact = L/M/H

| ID | Risk | L | I | Early warning | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| R1 | X API dependency (cost/ToS) | H | H | Pricing changes; 403; deletion SLA pain | **Do not depend on X for MVP** | Editorial/licensed quotes only |
| R2 | Content licensing / copyright | H | H | Takedown letters | Prefer original fabrications + licensed authentic | Remove verbatim social text |
| R3 | False attribution / defamation | M | H | Viral screenshot of fabricated card | Harmless-only fabrications; clear labels; review | Immediate tombstone + counsel |
| R4 | Defamation from “authentic” errors | M | H | Mis-verified card | Two-person verify; source URLs | Public correction + removal |
| R5 | Insufficient replayability | M | H | Low rematch | Content cadence; party ritual focus | Pivot modes; kill project cheaply after Phase 0 |
| R6 | Weak content quality | H | H | Playtests flat | Hire/assign editorial owner | Pause eng; fix cards |
| R7 | Poor motion detection | H | M | High motion_disable rate | Tap-first quality; calibrate; presets | Ship without forehead as primary |
| R8 | Social gameplay fails in practice | M | H | Groups confused | Phase 0 paper+prototype tests | Reposition as pass-and-play trivia |
| R9 | Limited audience | M | M | Weak ASO | Party-game keywords; college seeding | Niche creator decks |
| R10 | High moderation cost | M | H | Report volume | No public UGC early; sensitivity filters | Shrink catalog; raise rating |
| R11 | App Store / Play rejection | M | H | Review questions on deception | Obvious satire labels; report tooling | Rewrite store listing; remove risky decks |
| R12 | Celebrity publicity / likeness | M | H | Cease-and-desist | No photos; disclaimer; counsel | Fictional personas / licensed partners |
| R13 | Political controversy | H | H | Press backlash | No politics pack at launch | Hard kill political cards |
| R14 | UGC abuse | H | H | Toxic custom decks | Defer UGC; private-only later | Shutdown custom feature |
| R15 | Multiplayer complexity | H | M | Scope creep | Defer to Phase 3 | Keep local-only |
| R16 | Monetization reduces fun | M | M | Rematch drop after IAP | No ads in rounds; validate free first | Soften paywall |
| R17 | Name / trademark conflicts (“Tweet”) | H | H | USPTO/X ToS signals | Neutral master brand | Rename before store submit |
| R18 | Privacy / sensor misuse perception | L | M | App Store questions | On-device only; clear purpose string | Disable motion entirely |
| R19 | Remote `main` is not technically protected | M | H | Direct push or merge without a reviewed PR / DesignOps check | Use feature branches and PRs; require local gate and tracked hooks; inspect GitHub Actions before merge | Activate protected-branch rules when an eligible GitHub plan becomes available |

**Top five risks:** R1, R2/R3 (content legal), R6 (quality), R17 (name), R7 (motion).
