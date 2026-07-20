# DesignOps status

Read `AGENTS.md`, `.designops/mvp-build-status.md`, and the current `.designops/project.json`, then run:

```bash
node tools/designops/enforce.mjs --intent design --json
```

Then run `node tools/designops/enforce.mjs --intent implementation --json`. Summarize the current workflow phase, gate result, scope of the active MVP exception, and the exact categories of work permitted. State plainly that the fixture-only `apps/mobile/` MVP may continue when implementation returns `allowed`; do not imply a research or signed-review blocker. Do not modify files, draft approvals, or sign anything.
