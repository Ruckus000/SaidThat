# Did They Tweet That? — Agent Policy

This repository uses a fail-closed LaunchPad DesignOps workflow. These instructions apply to Cursor IDE, Cursor CLI, Cloud Agents, and any other coding agent.

## Required context before changes

Read these files before editing:

1. `.designops/project.json`
2. `.designops/00-ux-ui-plan.md`
3. `.designops/02-experience-strategy.md`
4. `.designops/03-requirements-map.json`
5. `.designops/09-review-report.json`

The current strategy is `review-required`. The active owner exception at `.designops/10-owner-implementation-exception.json` narrowly permits the documented local-first Expo MVP under `apps/mobile/`, bound to the AI tabletop simulation. It does not create participant evidence, legal clearance, a signed Direction/Handoff approval, or release readiness.

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

Exit `0` permits the requested work. Exits `1`, `2`, or `3` require stopping. Do not work around a nonzero result. The current exception grants `0` only for in-scope `apps/mobile/` MVP changes; all other implementation paths remain fail-closed.

## Non-negotiable rules

- Do not implement fonts, colors, layouts, components, or visual styling from `docs/ux-spec.md` as approved direction. Those values remain hypotheses until direction and handoff approval.
- Do not create application files while implementation intent is blocked.
- Do not infer user approval, fabricate review evidence, draft an approval record before an explicit user decision, access a reviewer private key, or sign a review.
- Do not store reviewer keys in this repository. The trusted public key must resolve outside the workspace; the private key must never be available to an agent or CI.
- Do not use `--no-verify`, disable Git hooks, weaken CI, alter integrity checks, or rewrite evidence hashes to conceal unrelated changes.
- Legitimate planning-source changes must update the typed evidence registry and invalidate/re-run affected downstream reviews.
- Accessibility, truth labeling, offline recovery, sensor failure, native lifecycle, and content-removal states are release requirements, not optional polish.

## Remote GitHub status

This private repository's current GitHub plan cannot enforce a ruleset or protected branch. Do not assume that `main` is remotely protected or that GitHub will block a direct push or merge.

The repository-owned enforcement command, signed reviews, and installed local Git hooks are the authoritative local controls. GitHub Actions reports the DesignOps result, and CODEOWNERS routes review requests, but neither is a remote merge or push gate today. Use feature branches and pull requests, inspect the DesignOps workflow result before merging, and never treat a green workflow as proof that GitHub enforced the merge path.

If this repository later gains an eligible GitHub plan, configure and activate branch protection before describing remote enforcement as active. Cursor rules and commands provide context; they do not replace local gates.

## Mandatory pre-merge review

Every pull request headed to `main` requires an evidence-based **code review and security review** before merge, even when GitHub does not technically require it. The reviewer must inspect the diff against `main`, run the smallest relevant tests and DesignOps range check, assess correctness, maintainability, integration impact, secrets/data exposure, authorization, and unsafe defaults, and resolve or explicitly accept every finding in the PR.

Do not merge on a green workflow alone. The required sequence is: local hooks and DesignOps check → GitHub `DesignOps policy / enforce` pass → code/security review with no unresolved findings → merge. No separate human merge decision is required once those conditions are met; an authorized agent may merge. This is an operating requirement; it remains manual until GitHub-side branch protection becomes available.
