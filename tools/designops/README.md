# DesignOps enforcement

The repository is intentionally planning-only until signed strategy, direction, and handoff gates are complete.

## Local setup

```bash
npm ci --prefix tools/launchpad-designops --omit=dev --ignore-scripts
node tools/designops/setup-git-hooks.mjs
node --test tools/designops/enforce.test.mjs
node tools/designops/enforce.mjs --intent design
```

The tracked pre-commit and pre-push hooks infer intent from changed paths. Planning paths may advance while a gate is review-required. Any other path is treated as application implementation and requires a current signed handoff approval.

## Reviewer trust

The reviewer—not Cursor or another coding agent—creates and retains the Ed25519 keypair outside this workspace. The default trusted public-key path is:

```text
~/.config/launchpad/reviewer-public.pem
```

Override it with `DESIGNOPS_TRUSTED_PUBLIC_KEY_FILE`. The private key must never enter this repository, an agent environment, or CI.

After an explicit human decision, the agent may prepare an unsigned review draft. The reviewer signs it outside the agent workflow with the vendored `sign-review.mjs`. Run the applicable gate with `--write` only when deliberately refreshing `.designops/09-review-report.json` and the manifest gate state.

## GitHub visibility and future branch protection

The repository has the `DESIGNOPS_REVIEWER_PUBLIC_KEY_PEM` Actions secret and a successful `DesignOps policy` workflow run. The workflow validates changed ranges and exposes the policy result in GitHub Actions.

This repository is private and its current GitHub plan cannot enforce repository rulesets or protected branches. GitHub Actions therefore cannot block a direct update to `main`, and CODEOWNERS only requests/routs review; neither is a hard remote control.

Current operating practice:

1. Create feature branches and submit pull requests for every change.
2. Run the local DesignOps gate and allow the tracked hooks to run before committing and pushing.
3. Confirm the `DesignOps policy / enforce` result for the pull request before merging.
4. Complete and resolve an evidence-based code review and security review before merging. Review the diff against `main`, run the smallest relevant checks, and assess correctness, maintainability, integration impact, secrets/data exposure, authorization, and unsafe defaults. A green workflow alone is not merge approval.

If the repository later has an eligible GitHub plan, activate branch protection for `main` and require pull requests, the `DesignOps policy / enforce` status check, one approval, CODEOWNER review, dismissal of stale approvals, and blocked force pushes and deletions. Only then is GitHub-side enforcement active. Cursor Cloud Agents must not be treated as remotely protected until that configuration is active.

## Release evidence

Release intent additionally requires `.designops/native-verification.json`, based on `native-verification.example.json`. Every iOS, Android, accessibility, sensor, lifecycle, offline, and performance evidence file is hash-bound. The record must also match the current commit and signed handoff approval digest.
