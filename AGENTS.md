# Did They Tweet That? — Agent Policy

This repository uses a fail-closed LaunchPad DesignOps workflow. These instructions apply to Cursor IDE, Cursor CLI, Cloud Agents, and any other coding agent.

## Required context before changes

Read these files before editing:

1. `.designops/project.json`
2. `.designops/00-ux-ui-plan.md`
3. `.designops/02-experience-strategy.md`
4. `.designops/03-requirements-map.json`
5. `.designops/09-review-report.json`
6. `.designops/mvp-build-status.md`
7. `.designops/06-content-state-map.json`, `.designops/07-design-dna.json`, and `.designops/08-design-system/tokens.json` for in-scope mobile work

The current strategy review remains unresolved, but it is **not an MVP build blocker**. The active owner exception at `.designops/10-owner-implementation-exception.json` and the decision record at `.designops/11-simulation-owner-handoff-decision.json` explicitly permit the documented local-first Expo MVP under `apps/mobile/`. Do not start or require further participant studies, external research, signed Direction/Handoff reviews, or evidence-gathering tasks merely to continue that scoped MVP build.

These records do not create participant evidence, legal clearance, an authentic playable public-figure card, a signed Direction/Handoff approval, or release readiness. Those are release conditions only.

## Mandatory gate

Before planning/design edits, run:

```bash
node tools/designops/enforce.mjs --intent design
```

Before creating or editing application code, app configuration, packages, native projects, Supabase resources, or build configuration, run:

```bash
node tools/designops/enforce.mjs --intent implementation
```

Before claiming release readiness, run:

```bash
node tools/designops/enforce.mjs --intent release
```

After edits, run:

```bash
node tools/designops/enforce.mjs --working-tree
```

Exit `0` permits the requested work. Exits `1`, `2`, or `3` require stopping. Do not work around a nonzero result. The current exception grants `0` for the in-scope `apps/mobile/` MVP; do not invent a research or signature prerequisite for that work. All other implementation paths remain fail-closed until explicitly scoped.

In a fresh clone or a new worktree, install the gate's own dependencies first:

```bash
npm ci --prefix tools/launchpad-designops --omit=dev --ignore-scripts
```

Without it, `node --test tools/designops/enforce.test.mjs` fails two tests that name neither the cause nor the remedy — "review-required planning reports the active MVP exception" and "pre-push hook classifies a new feature branch". Both are `ERR_MODULE_NOT_FOUND` for `ajv`, buried in a details string, and both pass once the install runs. Read as written they look like a real policy regression on a clean checkout. The commands above are unaffected and still exit `0`, which is what makes the failure confusing rather than obvious. The DesignOps workflow does this install as its own step, so CI never sees it.

## Non-negotiable rules

- Do not implement fonts, colors, layouts, components, or visual styling from `docs/ux-spec.md` as approved direction. Those values remain hypotheses until direction and handoff approval.
- Do not create application files while implementation intent is blocked.
- Do not infer user approval, fabricate review evidence, draft an approval record before an explicit user decision, access a reviewer private key, or sign a review.
- Do not store reviewer keys in this repository. The trusted public key must resolve outside the workspace; the private key must never be available to an agent or CI.
- Do not use `--no-verify`, disable Git hooks, weaken CI, alter integrity checks, or rewrite evidence hashes to conceal unrelated changes.
- Legitimate planning-source changes must update the typed evidence registry and invalidate/re-run affected downstream reviews.
- Accessibility, truth labeling, offline recovery, sensor failure, native lifecycle, and content-removal states are release requirements, not optional polish.

## Remote GitHub status

`main` **is** remotely protected. The active repository ruleset **"Protect main"** (id `19183364`, `enforcement: "active"`) targets `refs/heads/main` and is a real remote gate — it will block a merge, not merely report on one.

What it enforces today:

| Rule | Effect |
| --- | --- |
| `pull_request` | Direct pushes to `main` are refused; changes must arrive by pull request. |
| `required_approving_review_count: 0` | GitHub does **not** require an approving review — see below. |
| `dismiss_stale_reviews_on_push: true` | A push to the PR branch dismisses existing approvals. With zero required, this no longer blocks a merge. |
| `required_status_checks` | The `enforce` check (DesignOps policy) must pass, with `strict` on, so the branch must also be current with `main`. |
| `non_fast_forward`, `deletion` | Force pushes and branch deletion are blocked. |

`bypass_actors` is empty: nobody is exempt, including the repository owner. The gate applies uniformly rather than carving out an admin who can merge past a red `enforce`.

**The approval count is deliberately zero, and that makes the review requirement below load-bearing.** It was `1`, which was unsatisfiable in practice: this is a single-owner repository, GitHub refuses to let an author approve their own pull request, and agents operate as that same account — so every PR deadlocked with `the base branch policy prohibits the merge`. Owner decision 2026-08-16: drop the count to zero rather than add a bypass actor, because a bypass actor exempts its holder from *every* rule in the ruleset, including the `enforce` status check. Keeping the count at zero preserves the DesignOps gate for everyone.

The consequence: **no remote control now requires the code and security review.** GitHub enforces that a PR exists and that `enforce` is green, and nothing more. The "Mandatory pre-merge review" section below is a process rule that agents and humans must honour on their own; a merge is not authorized just because GitHub permits it.

Note that `gh api repos/.../branches/main/protection` returns `404 Branch not protected`. That legacy endpoint does not report rulesets and is **not** evidence that `main` is unprotected — use `gh api repos/.../rulesets` instead.

Scope of the remote gate: only `enforce` is a required status check. The `Mobile tests` workflow jobs (`test`, `changes`) are **not** required, so a red mobile test suite will not by itself block a merge. `require_code_owner_review` is also `false`, so CODEOWNERS still only routes review requests rather than requiring one. The repository-owned enforcement command, signed reviews, and installed local Git hooks remain the authoritative controls for everything the ruleset does not cover, and a green workflow is still not the same thing as a completed review. Cursor rules and commands provide context; they do not replace local gates.

## Mandatory pre-merge review

Every pull request headed to `main` requires an evidence-based **code review and security review** before merge, even when GitHub does not technically require it. The reviewer must inspect the diff against `main`, run the smallest relevant tests and DesignOps range check, assess correctness, maintainability, integration impact, secrets/data exposure, authorization, and unsafe defaults, and resolve or explicitly accept every finding in the PR.

Do not merge on a green workflow alone. The required sequence is: local hooks and DesignOps check → GitHub `DesignOps policy / enforce` pass → code/security review with no unresolved findings → merge. No separate human merge decision is required once those conditions are met; an authorized agent may merge. This is an operating requirement; it remains manual until GitHub-side branch protection becomes available.
