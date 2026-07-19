# Did They Tweet That? — Agent Policy

This repository uses a fail-closed LaunchPad DesignOps workflow. These instructions apply to Cursor IDE, Cursor CLI, Cloud Agents, and any other coding agent.

## Required context before changes

Read these files before editing:

1. `.designops/project.json`
2. `.designops/00-ux-ui-plan.md`
3. `.designops/02-experience-strategy.md`
4. `.designops/03-requirements-map.json`
5. `.designops/09-review-report.json`

The current strategy is `review-required`. Planning and DesignOps work may continue, but application implementation is blocked until current strategy, direction, and handoff approvals are explicitly reviewed and externally signed.

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

Exit `0` permits the requested work. Exits `1`, `2`, or `3` require stopping. Do not work around a nonzero result.

## Non-negotiable rules

- Do not implement fonts, colors, layouts, components, or visual styling from `docs/ux-spec.md` as approved direction. Those values remain hypotheses until direction and handoff approval.
- Do not create application files while implementation intent is blocked.
- Do not infer user approval, fabricate review evidence, draft an approval record before an explicit user decision, access a reviewer private key, or sign a review.
- Do not store reviewer keys in this repository. The trusted public key must resolve outside the workspace; the private key must never be available to an agent or CI.
- Do not use `--no-verify`, disable Git hooks, weaken CI, alter integrity checks, or rewrite evidence hashes to conceal unrelated changes.
- Legitimate planning-source changes must update the typed evidence registry and invalidate/re-run affected downstream reviews.
- Accessibility, truth labeling, offline recovery, sensor failure, native lifecycle, and content-removal states are release requirements, not optional polish.

The repository-owned enforcement command, signed reviews, protected branch, and CI are authoritative. Cursor rules and commands provide context but do not replace those gates.

