# Workflow Gates (0.2)

The public workflow has four executable profiles:

```text
strategy → direction → handoff → implementation → verification → release
```

| Profile | Required evidence | Review |
|---|---|---|
| `strategy` | Manifest, evidence brief, experience strategy, exact evidence/requirements registry | Machine-derived unless a high-risk core assumption triggers explicit framing review |
| `direction` | Strategy artifacts, exactly three territories, selected direction, and risk-triggered signed validation evidence | Explicit direction attestation after all kill criteria remain clear |
| `handoff` | Direction artifacts, Design DNA, tokens, content states, applicable proposal/demo specifications | Current direction and system attestations |
| `release` | Current handoff approval, fingerprint, implementation identity, and project verification for implemented UI | Current final attestation |

Audit mode supports only `strategy` and a reduced `release` profile. Implemented demos always require project verification. Artifact-only proposals do not require browser evidence unless configured as interactive UI.

Risk-triggered direction validation is required only when a high/critical assumption affects a primary task, safety, trust, content structure, or interaction model. Two modes exist:

- `solo-formative` is for a bounded author walkthrough when no real participant or independent reviewer exists. It may identify an implementation or reasoning hypothesis, but it always reports `hypothesis-only` and structurally blocks direction approval.
- `independent-study` is for real participant evidence. It requires a signed plan, one selected candidate and one countermodel, five or more moderated sessions, and counterbalanced ordering before a direction can be reviewed for approval.

`researchMode` describes the declared protocol; it is not an approval switch. The validator derives approval eligibility from the current signed plan, externally trusted key, and completed participant records. Declaring `independent-study` without that evidence fails closed and remains ineligible for approval.

The independent-study plan binds candidates, shared content, protocol, and kill criteria to the reviewer key. Workflow sequencing requires signing before sessions, but local files and timestamps do not independently prove chronology. Results are formative evidence, not population proof. Hashes establish artifact identity and freshness only; they do not prove evidence quality, usability, or design merit.

The runner deterministically cross-checks supported structured measures such as eligibility misunderstanding and unrecovered path failure. Other domain-specific kill criteria may use `human-observed` outcomes, which remain explicit and thresholded but depend on moderator evidence and the final signed human review; the gate must not describe them as independently machine-proven.

Run the gate with an explicit phase:

```bash
node <plugin-root>/scripts/quality-gate.mjs --root .designops --project-root . --phase direction --write \
  --trusted-reviewer-key ~/.config/launchpad/reviewer-public.pem
```

Exit codes are part of the contract:

- `0`: approved;
- `1`: blocked by a quality failure;
- `2`: deterministic checks pass but explicit review is required;
- `3`: gate, configuration, or checker failure.

The gate executes every check declared by the profile. A required `not-configured` result blocks progression. Missing check output is an internal failure. The gate writes the review report and derived manifest state atomically; the report is not an input claim.

## Attestations and freshness

Direction, handoff, and release attestations live under `.designops/reviews/`. They must contain the phase, reviewer label, explicit decision, required dimensions, evidence references, rationale, current approval digest, timestamp, `source: "explicit-user-attestation"`, and an Ed25519 signature.

Skills may draft an attestation only after the user explicitly supplies that decision. The generating agent must not infer approval or handle the reviewer private key. The reviewer signs the record outside the agent workflow with `sign-review.mjs`; the gate verifies it against `--trusted-reviewer-key`, which must resolve outside the project. The signature proves possession of that key and protects signed fields from modification. It does not independently establish legal identity or protect a compromised reviewer key.

The gate separately derives design, implementation, verification-input, and approval digests. Changes to a relevant design artifact, proposal/demo specification, source file, task test, verification configuration, or verification report invalidate downstream evidence.
