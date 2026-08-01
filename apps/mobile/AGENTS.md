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
(cd apps/mobile && npx expo export --platform android --output-dir /private/tmp/said-that-android-export)
node tools/designops/enforce.mjs --intent implementation --working-tree
node --test tools/designops/enforce.test.mjs
```

That last one is what CI runs, and it is not implied by the others: `enforce.mjs`
checks whether *this change* is permitted, while `enforce.test.mjs` checks the
DesignOps records themselves — including the SHA-256 pins in
`.designops/11-simulation-owner-handoff-decision.json` that fix which version of
each evidence file the owner decision rests on. Editing a pinned file (notably
`.designops/08-design-system/tokens.json`) turns CI red without any of the other
five commands noticing. If you changed one deliberately, re-pin its hash in the
same commit.

There is a second, separately enforced pin set, and it is the one you are more
likely to trip: every entry under `sources` in
`.designops/03-requirements-map.json` pins a `sha256` over a planning document —
`README.md`, all of `docs/**` including `docs/mvp-build-queue.md`, and
`.designops/mvp-build-status.md`. Those are checked by `enforce.mjs`, not
`enforce.test.mjs`, so editing one blocks command 5 rather than command 6, with
`Registered planning evidence is stale or missing`. Same remedy: re-pin the
`sha256` for that entry in the same commit. This file is not registered, so
editing it needs no re-pin.

Both exports, not just iOS. Metro prefers platform-specific files (`foo.android.ts`
over `foo.ts`) and platform-specific assets, so an Android-only resolution failure
passes typecheck, both test suites, and the iOS export — a gap confirmed by breaking
one on purpose, not assumed. CI runs the same pair.
