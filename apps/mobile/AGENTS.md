# Mobile MVP agent handoff

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code, then read the repository root `AGENTS.md`.

Before editing, run `node tools/designops/enforce.mjs --intent implementation`. The scoped local-first fixture MVP is allowed under `.designops/10-owner-implementation-exception.json` and `.designops/11-simulation-owner-handoff-decision.json`; do not require more research or a signed Direction/Handoff review to continue it.

Use these implementation sources of truth:

1. `docs/mvp-build-queue.md`
2. `.designops/06-content-state-map.json`
3. `.designops/07-design-dna.json`
4. `.designops/08-design-system/tokens.json`
5. `.designops/demo-spec.md`
6. `README.md` and this directory's `README.md`

Stay fixture-only and local-first. Do not add public-figure claims, accounts, live social data, public uploads, a backend, or release assertions. Preserve exactly-one-commit behavior, holder privacy, Private Relay shutter recovery, minimized bounded reports, tap-only equivalence, and clear text truth labels.

For every focused task, add or update deterministic tests and run:

```bash
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
(cd apps/mobile && npx expo export --platform ios --output-dir /private/tmp/said-that-ios-export)
node tools/designops/enforce.mjs --intent implementation --working-tree
```
