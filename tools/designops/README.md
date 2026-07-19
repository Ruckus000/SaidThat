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

## CI and branch protection

When this repository is connected to GitHub:

1. Add `DESIGNOPS_REVIEWER_PUBLIC_KEY_PEM` as a GitHub Actions secret containing only the public key.
2. Protect `main` and require pull requests, the `DesignOps policy` check, one CODEOWNER approval, dismissal of stale approvals, and no force pushes or bypass.
3. Connect the protected GitHub repository to Cursor Cloud Agents.

Until those remote settings exist, local Git hooks are active but cannot substitute for protected-branch enforcement.

## Release evidence

Release intent additionally requires `.designops/native-verification.json`, based on `native-verification.example.json`. Every iOS, Android, accessibility, sensor, lifecycle, offline, and performance evidence file is hash-bound. The record must also match the current commit and signed handoff approval digest.
