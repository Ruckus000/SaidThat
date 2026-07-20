# MVP next task

Read `AGENTS.md`, `apps/mobile/AGENTS.md`, `.designops/mvp-build-status.md`, and `docs/mvp-build-queue.md`.

Run `node tools/designops/enforce.mjs --intent implementation --json`. If it is not `allowed`, stop and report the exact output. If it is allowed, select the first incomplete task in the queue that has no unmet dependency.

Implement only that focused task. Preserve fixture-only, local-first scope and all privacy, truth-labeling, accessibility, and recovery constraints. Add deterministic coverage for every reducer, storage, or content-policy behavior changed. Run the checks listed in `apps/mobile/AGENTS.md`, then run `node tools/designops/enforce.mjs --intent implementation --working-tree`.

Open a focused PR. Before merging, require the repository's code review and security review standard; do not self-declare release readiness.
