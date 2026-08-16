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

## GitHub visibility and branch protection

The repository has the `DESIGNOPS_REVIEWER_PUBLIC_KEY_PEM` Actions secret and a successful `DesignOps policy` workflow run. The workflow validates changed ranges and exposes the policy result in GitHub Actions.

Branch protection is **active**. The repository ruleset "Protect main" (id `19183364`) targets `refs/heads/main` and requires a pull request and a passing `enforce` status check; it blocks force pushes and deletions, with no bypass actors. See the root `AGENTS.md` "Remote GitHub status" section for the full rule table.

What that gate does **not** cover: `required_approving_review_count` is `0` (an author cannot approve their own PR, and this is a single-owner repository, so a nonzero count deadlocked every merge), `require_code_owner_review` is `false`, and `enforce` is the only required status check — the `Mobile tests` jobs cannot block a merge on their own. The code review and security review below are therefore enforced by practice, not by GitHub.

Current operating practice:

1. Create feature branches and submit pull requests for every change.
2. Run the local DesignOps gate and allow the tracked hooks to run before committing and pushing.
3. Confirm the `DesignOps policy / enforce` result for the pull request before merging.
4. Complete and resolve an evidence-based code review and security review before merging. Review the diff against `main`, run the smallest relevant checks, and assess correctness, maintainability, integration impact, secrets/data exposure, authorization, and unsafe defaults. A green workflow alone is not merge approval; once the DesignOps result and both reviews are clear, an authorized agent may merge without a separate human merge decision.

Remaining hardening for the ruleset: add the `Mobile tests` jobs to the required status checks so a failing test suite blocks a merge the way the DesignOps check already does. Restoring a required approval (and `require_code_owner_review`) needs a second reviewing account first, or every merge deadlocks again.

## Release evidence

Release intent additionally requires `.designops/native-verification.json`, based on `native-verification.example.json`. Every iOS, Android, accessibility, sensor, lifecycle, offline, and performance evidence file is hash-bound. The record must also match the current commit and signed handoff approval digest.
