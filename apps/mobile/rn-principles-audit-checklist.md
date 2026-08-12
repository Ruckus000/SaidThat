# React Native principles audit checklist

**Status:** Audit instrument only. Completing rows here does not claim release
readiness, accessibility conformance, or DesignOps approval.

**Scope:** Local-first Expo MVP under [`apps/mobile/`](./). Every keep-item
survived **YAGNI → KISS → SRP → DRY**. Industry advice that fails that filter
is listed under [Excluded as bloat](#excluded-as-bloat)—do not treat those as
fail grades for this MVP.

**How to use:** For each row, mark `pass` / `fail` / `n/a` with a one-line note
and a file path. Prefer reading code or running existing tests/exports; do not
add a toolchain just to audit.

Related: [`native-verification-checklist.md`](./native-verification-checklist.md)
(device evidence), [`AGENTS.md`](./AGENTS.md) (agent handoff).

---

## Development principles (rubric)

Conflict order for early-stage / MVP work:

1. **YAGNI** — Do not build “for later” without a current requirement or named near-term milestone.
2. **KISS** — Prefer the simplest correct, readable solution.
3. **SRP** — One job per module/class/function; one reason to change.
4. **DRY** — One source of truth for a rule—only after 2–3 real repeats with the same meaning.

When principles conflict: **YAGNI > KISS > SRP > DRY**. SRP beats DRY when sharing would create a god utility. KISS beats DRY when abstraction hurts readability.

### SRP checklist

- Can I describe this file/class/function without using “and”?
- If requirements change, is it likely only this component changes?
- Is business logic isolated from frameworks (HTTP, DB, UI)?

### DRY checklist

- Did I copy/paste a **rule**? Should it be shared?
- Are there multiple definitions of the same validation / permissions / game invariant?
- If I change this rule, do I know the single place to change it?

### KISS checklist

- Could a new dev understand this in ~5 minutes?
- Am I adding a pattern “because best practice” rather than needed?
- Is there a simpler design with fewer moving parts?

### YAGNI checklist

- Needed for today’s requirements or a named near-term milestone?
- Is there a real use case asking for this now?
- Can we add it later without rewriting everything (good seams)?

### PR / code review (copy-paste)

- [ ] SRP: one job per component? Any god files forming?
- [ ] DRY: copy/paste rules? Would a change miss a spot?
- [ ] KISS: simplest correct approach? Unnecessary patterns?
- [ ] YAGNI: anything built “for later” without a current requirement?
- [ ] Tests: core rules covered at domain / seam level?

---

## Architecture boundaries (this repo)

Do **not** invent unused layers. Audit against what exists:

| Boundary | Location | Must not |
| --- | --- | --- |
| Domain (pure rules) | [`src/domain/`](./src/domain/) | Import `react-native`, `expo-*`, AsyncStorage, or UI |
| Orchestration | [`App.tsx`](./App.tsx) | Re-implement game rules; grow into a god file |
| Storage / repos | [`src/storage/`](./src/storage/) | Encode playability or scoring rules |
| Sensors / platform | [`src/sensors/`](./src/sensors/) | Decide commits without calling domain predicates |
| UI | [`src/components/`](./src/components/) | Own content-safety or commit-once logic |
| Content gating | [`src/content/`](./src/content/) + domain `isPlayableCard` | Bypass tombstones / playability for “something to show” |

Boundary rule: framework code at the edges; business rules in the center.

---

## Audit items

Legend: **Principle** = primary filter tag. Mark each row when auditing.

### 1. Domain purity and game invariants

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| D1 | Game rules live in screens / `App.tsx` | UI churn breaks safety invariants | `rg` commit / playable / shutter logic outside `src/domain` | Commit-once, playability, report shape, private shutter owned by domain | SRP |
| D2 | Domain imports RN or Expo | Couples pure tests to native runtime | `rg "from ['\"]react-native\|from ['\"]expo" src/domain` | No RN/Expo imports under `src/domain/` | SRP |
| D3 | Commit-once rule re-stated in UI | Tilt haptic / buttons can disagree with reducer | Compare tilt path to `canCommitAnswer` | UI asks domain predicate; does not duplicate the condition | DRY |
| D4 | Playability / approvals re-implemented in content or UI | Unapproved or withheld cards become playable | Trace `isPlayableCard` / tombstones vs ad-hoc filters | Single owner for playability; content pipeline calls it | DRY |
| D5 | Fail-closed content states playable as binary claims | Players treat removed/disputed as “said it / didn’t” | Deck build + `NON_PLAYABLE` / corrupt → content-unavailable | `disputed` / `removed` / `source-unavailable` / corrupt never enter binary play | SRP |
| D6 | Report payload grows identity or statement text | Local queue becomes a privacy leak | Read `reportPayload` / queue writers | Only minimized fields (`cardId`, reason, deck version, timestamp); bounded queue | DRY |
| D7 | Truth labels only in color / animation | A11y and review honesty fail | Review / result presentation | Textual truth labels; not color-only meaning | SRP |

### 2. React Native / Expo runtime hygiene

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| R1 | Missing `useEffect` cleanup (AppState, sensors, timers) | Memory growth; duplicate handlers after remount | Inspect effects in `App.tsx`, sensors, motion | Subscriptions/timers removed on unmount or dependency change | KISS |
| R2 | Native bridge await with no timeout | Wedged AsyncStorage / Share / sensors hang UI forever | Storage / report / export / calibrate paths | Hung calls bounded (`withTimeout` or equivalent); UI can recover | KISS |
| R3 | Live sensor subscribe throws uncaught | Optional tilt takes down the tree | Sensor subscribe path vs calibration try/catch | Subscribe failures degrade to tap-only; no crash loop | KISS |
| R4 | No error boundary above app shell | Render/effect throws white-screen with no recovery | `Root` / `index` composition | Error boundary above `App`; async still must settle (see R2) | KISS |
| R5 | Font/asset gate never times out | Permanent blank `SafeAreaView` | Font load gating in `App.tsx` | Load error **or** timeout falls through; app still renders | YAGNI |
| R6 | `ScrollView` for unbounded / huge lists | Mounts every row; jank and memory | Any list of unbounded user/content length | Party-sized fixed runs OK in `ScrollView`; unbounded feeds need virtualization **when they exist** | YAGNI |
| R7 | Component defined inside another component | Remounts wipe state; breaks memo identity | Nested `function` / `const X = () =>` inside render | Screen-level components are module scope | KISS |
| R8 | `onLayout` / scroll handlers `setState` a new object every time | Maximum update depth / render loops | Layout handlers that always allocate `{x,y,width,…}` into state | Guard with equality; only update when values change | KISS |
| R9 | iOS-only assumptions in product code | Android-only resolution / behavior bugs | Platform-specific files; CI/export both platforms | Both `export:ios` and `export:android` considered for changes | KISS |

### 3. State and rendering

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| S1 | Global store “for later” (Redux/Zustand/Jotai) with no shared-subscription pain | Extra indirection, no current consumer need | `package.json` + imports | Stick to `useReducer` / local state unless a real cross-tree subscription problem appears | YAGNI |
| S2 | High-frequency game ticks in React Context | Every consumer re-renders each tick | Context providers holding round/score clocks | Context for rare wide data (theme/settings); game ticks stay in reducer/local state | KISS |
| S3 | Carpet-bomb `useMemo` / `useCallback` / `React.memo` | Noise, harder diffs, false confidence | New hooks without a measured remount/parent pain | Add memoization only for stable identities required by hooks/native, or proven cost | YAGNI |
| S4 | Frequently changing state lifted too high | Large trees re-render on every answer / tick | State ownership in `App` vs screen | Keep ephemeral UI (busy flags, calibration) local; session rules in reducer | SRP |
| S5 | Server/remote cache libraries with no network client | Dead weight and fake “offline sync” | TanStack Query / sync SDKs while app stays local-first | No remote-state stack until there is a real remote | YAGNI |

### 4. Navigation and lifecycle

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| N1 | Rewrite stage machine to Expo Router “because modern” | Large migration, no product requirement | New router dependency without multi-route IA need | Stage machine in `App` is fine for this MVP | YAGNI |
| N2 | Background / inactive does not protect Private Relay | Spoiler / wrong-player reveal on shared phone | `APP_BACKGROUND` / shutter path | Private Relay → shutter + discard policy; Room Beacon → pause without spoiler | SRP |
| N3 | Explicit pause routed through interruption action | Burns cards or opens shutter when label said “pause” | `REQUEST_PAUSE` vs `APP_BACKGROUND` | Deliberate pause ≠ involuntary background | DRY |
| N4 | Duplicate answer after pause/resume or rematch | Score inflation; room confusion | Reducer + App wiring tests | Exactly one commit per round; rematch does not reuse stale UI reveal/report scope | DRY |
| N5 | Mixing Expo Router hooks under a foreign navigator | Infinite re-render loops | Router hooks outside router screens | N/A while no Expo Router; if added later, hooks only in router screens | KISS |

### 5. Accessibility and input

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| A1 | Motion-only answer path | Blocks tap / VoiceOver / TalkBack users | Round controls | Tap path always complete; motion opt-in only | SRP |
| A2 | Holder prompt exposed to assistive tech (Room Beacon) | Forehead holder hears the answer | `canExposeCardToAssistiveTech` / a11y props | Holder path hides active prompt from AT | SRP |
| A3 | `allowFontScaling={false}` / max multiplier clamps | Large-text users lose copy / controls | `fontScaling` guard tests / source scan | Text scales with system settings | KISS |
| A4 | Recovery screens with no reachable action or clipped reason | Dead end when deck fails | Content-unavailable / shutter / paused | On-screen recovery; critical copy scrolls, not clipped | KISS |
| A5 | KeyboardAvoiding / TextInput stacks with no inputs | Dead API surface | Presence of text inputs | Only add keyboard handling when inputs exist | YAGNI |

### 6. Security and data (local-first)

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| C1 | Secrets / API keys in the bundle | Trivial extraction | Env hardcoded in app source | No client secrets; no pretend “secure” key in JS | YAGNI |
| C2 | Accidental `fetch` / analytics / telemetry | Breaks offline promise; privacy | `rg fetch\|XMLHttpRequest\|analytics\|sentry\|amplitude` in non-test app source | No network/telemetry client in product path | YAGNI |
| C3 | PII or statement text in AsyncStorage | Device backup / shared-phone leak | Report + playtest stores | Minimized local records only | SRP |
| C4 | Unbounded local queues | Storage growth; stale confirmations | Report queue policy | Cap + newest-wins; corrupt JSON → safe empty | KISS |

### 7. Performance (evidence, not cargo cult)

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| P1 | Heavy sync work on the answer / commit path | Dropped frames when the room is waiting | Answer handlers, reducers | Commit path stays cheap; defer research/storage (`void` + catch) | KISS |
| P2 | Remote / huge images without need | Memory and decode cost | Image usage | Local fixtures/fonts OK; don’t add remote image stacks unused | YAGNI |
| P3 | Treating simulator timings as release performance proof | False launch confidence | Perf claims vs device evidence | Cold start / FPS claims need device evidence (native verification) | KISS |
| P4 | Optimizing before a measured problem | Noise PRs; missed real bottlenecks | Memo/FlashList PRs without profile or jank report | Fix measured jank; don’t pre-optimize the 10-card run | YAGNI |

### 8. Testing and seams

| ID | Pitfall | Why it matters | How to detect | Pass criteria | Principle |
| --- | --- | --- | --- | --- | --- |
| T1 | Safety rules only tested via UI | Regressions slip when screens move | `src/domain/*.test.*` | Chaos / invariant tests at domain level | SRP |
| T2 | Storage / lifecycle hangs untested at wiring | Reducer green, App still deadlocks | `App.test.tsx`, storage timeout tests | Hang/refuse paths covered where `App` awaits native | KISS |
| T3 | New seam without a focused test | Next change re-breaks the same hole | PR adds bridge/timeout/privacy path | Extend smallest existing suite; no exploit PoCs | YAGNI |
| T4 | Skipping dual-platform export after resolution-sensitive change | Android-only Metro failures | CI / local export scripts | Both iOS and Android export when relevant | KISS |

---

## Excluded as bloat

Do **not** fail an MVP audit for lacking these. They fail YAGNI and/or KISS for the current local-first Expo product:

| Common “must” | Why excluded here |
| --- | --- |
| Mandate Expo Router / React Navigation rewrite | Stage machine fits the product; no multi-route IA requirement |
| Mandate Redux / Zustand / Jotai | `useReducer` is enough; no shared high-frequency store pain |
| Mandate FlashList / Reanimated worklets by default | Fixed short runs; core `Animated` is intentional (see theme motion notes) |
| Bridge / New Architecture migration checklist without breakage | No evidence of bridge congestion; don’t theater-migrate |
| Certificate pinning, root/jailbreak detection, ProGuard as launch gates | No network API / no secret client logic to protect that way |
| Premature `memo` / `useCallback` everywhere | Conflicts with KISS and React Compiler guidance |
| Split into monorepo `packages/*` before shared consumers | Single app; premature boundaries |
| Backend, auth, offline-sync, TanStack Query | Product is account-free and local-first |
| Deep linking / universal links setup | No multi-entry URL product surface yet |
| Hermes / New Arch “verify enabled” as a principles row | Tooling default; not an SRP/DRY audit item—track in release ops if needed |

---

## Stop-and-refactor triggers

Refactor when you see:

- **SRP:** `App.tsx` (or any file) owning 3+ jobs beyond wiring—e.g. inventing game rules **and** storage policy **and** presentation copy.
- **DRY:** The same rule (commit-once, playability, report shape, truth label) implemented 2–3 times.
- **KISS:** A change requires touching many unrelated files for one behavior.
- **YAGNI:** A “generic” platform kit, navigation framework, or state library added with one (or zero) real callers.
- **Lists:** An unbounded feed appears and still uses a full-mount `ScrollView` (then virtualize—don’t before).

---

## Suggested audit commands (no new toolchain)

```bash
# Domain must stay framework-free
rg "from ['\"]react-native|from ['\"]expo" apps/mobile/src/domain

# No product network / analytics clients
rg "\\bfetch\\b|XMLHttpRequest|WebSocket|analytics|sentry|amplitude|supabase" apps/mobile/src apps/mobile/App.tsx

# Font scaling clamps
rg "allowFontScaling|maxFontSizeMultiplier" apps/mobile

# Existing suites
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
npm --prefix apps/mobile run export:ios
npm --prefix apps/mobile run export:android
```

---

## Seam map (why these rows exist)

Cross-check against current tree—rows map to real modules, not blog abstractions:

| Seam | Modules |
| --- | --- |
| Pure game / content rules | `src/domain/game.js`, `contentRules.js`, `reportPolicy.js`, `runBuilder.js` |
| Deck gating | `src/content/validateDeck.js`, `catalog.js` |
| App orchestration | `App.tsx` (AppState, fonts, report/export timeouts, tilt wiring) |
| Storage edge | `src/storage/withTimeout.js`, `reportQueue.js`, `playtestStore.js` |
| Sensors edge | `src/sensors/useRoomBeaconMotion.ts`, `roomBeaconMotion.js` |
| UI / a11y / labels | `src/components/*`, `presentationLabels.js`, `ErrorBoundary.tsx`, `Root.tsx` |
| Domain chaos tests | `src/domain/game.test.mjs` |
| Wiring tests | `App.test.tsx`, storage/sensor tests |

When a new seam appears, add a row only if it survives YAGNI → KISS → SRP → DRY; otherwise put it in Excluded as bloat.
