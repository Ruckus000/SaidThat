import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isPlayableCard } from "../../apps/mobile/src/domain/game.js";

import {
  EnforcementError,
  PROJECT_ROOT,
  assertGateDecision,
  classifyPath,
  computeVendorDigest,
  gatePhaseForIntent,
  inferIntent,
  resolveTrustedReviewerKey,
  validateImplementationException,
  validateNativeVerification,
  verifySourceIntegrity,
  verifyVendorIntegrity
} from "./enforce.mjs";

const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

test("planning and implementation paths are classified fail-closed", () => {
  assert.equal(classifyPath(".designops/project.json"), "planning");
  assert.equal(classifyPath("docs/ux-spec.md"), "planning");
  assert.equal(classifyPath("tools/designops/enforce.mjs"), "planning");
  assert.equal(classifyPath("AGENTS.md"), "planning");
  assert.equal(classifyPath("apps/mobile/app.tsx"), "implementation");
  assert.equal(classifyPath("packages/game-engine/index.ts"), "implementation");
  assert.equal(classifyPath("app.json"), "implementation");
  assert.equal(classifyPath("tsconfig.json"), "implementation");
});

test("intent inference blocks implementation paths declared as design work", () => {
  assert.equal(inferIntent(["docs/ux-spec.md"], null), "design");
  assert.equal(inferIntent(["apps/mobile/app.tsx"], null), "implementation");
  assert.throws(
    () => inferIntent(["apps/mobile/app.tsx"], "design"),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("phase selection requires handoff for implementation and release for shipping", () => {
  assert.equal(gatePhaseForIntent("design", "strategy"), "strategy");
  assert.equal(gatePhaseForIntent("design", "direction"), "direction");
  assert.equal(gatePhaseForIntent("design", "implementation"), "handoff");
  assert.equal(gatePhaseForIntent("implementation", "strategy"), "handoff");
  assert.equal(gatePhaseForIntent("release", "implementation"), "release");
});

test("review-required gates permit planning but block implementation", () => {
  assert.deepEqual(assertGateDecision("design", "strategy", { exitCode: 2, stdout: "review required", stderr: "" }), { reviewRequired: true });
  assert.deepEqual(assertGateDecision("implementation", "handoff", { exitCode: 0, stdout: "approved", stderr: "" }), { reviewRequired: false });
  assert.throws(
    () => assertGateDecision("implementation", "handoff", { exitCode: 2, stdout: "review required", stderr: "" }),
    (error) => error instanceof EnforcementError && error.exitCode === 2
  );
  assert.throws(
    () => assertGateDecision("release", "release", { exitCode: 1, stdout: "blocked", stderr: "" }),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("review-required planning reports the active MVP exception without widening it", async () => {
  const result = spawnSync(process.execPath, ["tools/designops/enforce.mjs", "--intent", "design", "--json"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.decision, "allowed");
  assert.match(payload.message, /scoped local-first MVP under apps\/mobile/);
});

test("pre-push hook classifies a new feature branch relative to origin/main", () => {
  // Isolate the synthetic planning commit in a disposable clone. Borrowing
  // HEAD made this assertion depend on whether the current feature branch had
  // application changes; writing an unreachable object to the real checkout
  // breaks sandboxed and read-only test environments.
  const cloneDirectory = mkdtempSync(path.join(os.tmpdir(), "designops-hook-repo-"));
  const repo = path.join(cloneDirectory, "repo");
  try {
    const clone = spawnSync("git", ["clone", "--quiet", "--no-hardlinks", PROJECT_ROOT, repo], { encoding: "utf8" });
    assert.equal(clone.status, 0, clone.stderr);
    // GitHub Actions checks out the PR at a detached commit, so its source
    // repository may have origin/main only as a remote-tracking ref. The
    // disposable clone uses its checked-out base as an explicit origin/main
    // reference; the tested range remains exactly one planning-only commit.
    const baseRef = spawnSync("git", ["update-ref", "refs/remotes/origin/main", "HEAD"], { cwd: repo, encoding: "utf8" });
    assert.equal(baseRef.status, 0, baseRef.stderr);
    const sourceDependencies = path.join(PROJECT_ROOT, "tools", "launchpad-designops", "node_modules");
    assert.equal(existsSync(sourceDependencies), true, "The vendored DesignOps dependencies must be installed before the hook regression test runs.");
    symlinkSync(sourceDependencies, path.join(repo, "tools", "launchpad-designops", "node_modules"), "dir");
    const branch = spawnSync("git", ["switch", "-c", "feature/designops-hook-test"], { cwd: repo, encoding: "utf8" });
    assert.equal(branch.status, 0, branch.stderr);
    const fixturePath = path.join(repo, "docs", "pre-push-fixture.md");
    writeFileSync(fixturePath, "planning-only pre-push fixture\n");
    const add = spawnSync("git", ["add", "docs/pre-push-fixture.md"], { cwd: repo, encoding: "utf8" });
    assert.equal(add.status, 0, add.stderr);
    const commit = spawnSync("git", ["-c", "user.name=DesignOps test", "-c", "user.email=designops-test@example.invalid", "commit", "-m", "test: planning-only hook fixture"], { cwd: repo, encoding: "utf8" });
    assert.equal(commit.status, 0, commit.stderr);
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" });
    assert.equal(head.status, 0, head.stderr);

    const ref = "refs/heads/feature/designops-hook-test";
    const result = spawnSync("sh", [path.join(repo, ".githooks/pre-push")], {
      cwd: repo,
      encoding: "utf8",
      input: `${ref} ${head.stdout.trim()} ${ref} ${"0".repeat(40)}\n`
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /intent=design phase=strategy gateExit=(?:0|2)/);
  } finally {
    rmSync(cloneDirectory, { recursive: true, force: true });
  }
});

test("registered source hashes pass and stale evidence fails", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "designops-source-test-"));
  await mkdir(path.join(root, ".designops"));
  const content = "approved planning source\n";
  await writeFile(path.join(root, "brief.md"), content);
  const requirements = path.join(root, ".designops/03-requirements-map.json");
  await writeFile(requirements, JSON.stringify({ sources: [{ id: "brief", locator: "brief.md", sha256: digest(content) }] }));
  assert.deepEqual(await verifySourceIntegrity(root, requirements), { checked: 1 });
  await writeFile(path.join(root, "brief.md"), "changed without registry update\n");
  await assert.rejects(
    verifySourceIntegrity(root, requirements),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("trusted reviewer keys must exist outside the project", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "designops-key-test-"));
  const root = path.join(parent, "project");
  await mkdir(root);
  const external = path.join(parent, "reviewer-public.pem");
  await writeFile(external, "public-key-test");
  assert.equal(await resolveTrustedReviewerKey(root, external, { required: true }), await realpath(external));

  const internal = path.join(root, "reviewer-public.pem");
  await writeFile(internal, "public-key-test");
  await assert.rejects(
    resolveTrustedReviewerKey(root, internal, { required: true }),
    (error) => error instanceof EnforcementError && error.exitCode === 3
  );
});

test("owner implementation exception is simulation-bound and limited to the mobile MVP", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "designops-owner-exception-test-"));
  const simulation = path.join(root, ".designops/05-direction-validation/ai-tabletop-simulation");
  await mkdir(simulation, { recursive: true });
  const evidencePath = path.join(simulation, "trace.md");
  const evidence = "simulation-only\n";
  await writeFile(evidencePath, evidence);
  await writeFile(path.join(root, ".designops/10-owner-implementation-exception.json"), JSON.stringify({
    schemaVersion: "1",
    status: "active",
    scope: "full-mvp-local-first",
    allowedImplementationPrefixes: ["apps/mobile/"],
    simulationEvidence: [{ path: ".designops/05-direction-validation/ai-tabletop-simulation/trace.md", sha256: digest(evidence) }],
    constraints: ["This exception does not convert AI simulation output into participant evidence."]
  }));
  assert.equal((await validateImplementationException(["apps/mobile/App.tsx"], root)).scope, "full-mvp-local-first");
  await assert.rejects(
    validateImplementationException(["supabase/schema.sql"], root),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
  await writeFile(evidencePath, "stale simulation\n");
  await assert.rejects(
    validateImplementationException(["apps/mobile/App.tsx"], root),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("vendored runtime checksum matches the recorded manifest", async () => {
  const result = await verifyVendorIntegrity();
  assert.equal(result.fileCount, result.manifest.fileCount);
  assert.equal(result.sha256, result.manifest.sha256);
});

test("vendor digest detects runtime mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "designops-vendor-test-"));
  await mkdir(path.join(root, "scripts"));
  await writeFile(path.join(root, "scripts/gate.mjs"), "export const gate = true;\n");
  await writeFile(path.join(root, "INTEGRITY.json"), JSON.stringify({ included: ["scripts"], fileCount: 1, sha256: "placeholder" }));
  const first = await computeVendorDigest(root);
  await writeFile(path.join(root, "INTEGRITY.json"), JSON.stringify({ included: ["scripts"], fileCount: 1, sha256: first.sha256 }));
  await verifyVendorIntegrity(root);
  await writeFile(path.join(root, "scripts/gate.mjs"), "export const gate = false;\n");
  await assert.rejects(
    verifyVendorIntegrity(root),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("repository requirements registry still matches all registered planning sources", async () => {
  const result = await verifySourceIntegrity(PROJECT_ROOT, path.join(PROJECT_ROOT, ".designops/03-requirements-map.json"));
  assert.ok(result.checked >= 1);
  const registry = JSON.parse(await readFile(path.join(PROJECT_ROOT, ".designops/03-requirements-map.json"), "utf8"));
  assert.equal(result.checked, registry.sources.filter((source) => source.sha256).length);
});

test("release evidence fails closed when native verification is absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "designops-native-test-"));
  await mkdir(path.join(root, ".designops"));
  await assert.rejects(
    validateNativeVerification({ workflow: { gates: { handoff: { approvalDigest: "sha256:test" } } } }, root),
    (error) => error instanceof EnforcementError && error.exitCode === 1
  );
});

test("Cursor policy files preserve the required UX, trust, and gate instructions", async () => {
  const agents = await readFile(path.join(PROJECT_ROOT, "AGENTS.md"), "utf8");
  const globalRule = await readFile(path.join(PROJECT_ROOT, ".cursor/rules/designops-enforcement.mdc"), "utf8");
  const mobileRule = await readFile(path.join(PROJECT_ROOT, ".cursor/rules/mobile-ux-requirements.mdc"), "utf8");
  const contentRule = await readFile(path.join(PROJECT_ROOT, ".cursor/rules/content-trust-requirements.mdc"), "utf8");
  const environment = JSON.parse(await readFile(path.join(PROJECT_ROOT, ".cursor/environment.json"), "utf8"));

  for (const required of ["--intent design", "--intent implementation", "--intent release", "--working-tree", "private key", "--no-verify"]) {
    assert.ok(`${agents}\n${globalRule}`.includes(required), `missing global policy instruction: ${required}`);
  }
  for (const required of ["tap-only", "VoiceOver", "TalkBack", "sensor", "lifecycle", "offline", "performance"]) {
    assert.ok(mobileRule.includes(required), `missing mobile requirement: ${required}`);
  }
  for (const required of ["Authentic", "fabricated-for-the-game", "disputed", "removed", "source-unavailable", "tombstones"]) {
    assert.ok(contentRule.includes(required), `missing trust requirement: ${required}`);
  }
  assert.equal(environment.install, "npm ci --prefix tools/launchpad-designops --omit=dev --ignore-scripts && npm ci --prefix apps/mobile --ignore-scripts");
});

test("Cursor handoff points to the active fixture-MVP queue and no longer states that it is blocked", async () => {
  const rootReadme = await readFile(path.join(PROJECT_ROOT, "README.md"), "utf8");
  const mobileAgents = await readFile(path.join(PROJECT_ROOT, "apps/mobile/AGENTS.md"), "utf8");
  const mobileRule = await readFile(path.join(PROJECT_ROOT, ".cursor/rules/mobile-ux-requirements.mdc"), "utf8");
  const queue = await readFile(path.join(PROJECT_ROOT, "docs/mvp-build-queue.md"), "utf8");
  const command = await readFile(path.join(PROJECT_ROOT, ".cursor/commands/mvp-next.md"), "utf8");

  for (const textValue of [rootReadme, mobileAgents, mobileRule, command]) {
    assert.match(textValue, /mvp-build-queue\.md/);
    assert.match(textValue, /fixture-only/i);
  }
  assert.match(queue, /fixture-only/i);
  assert.doesNotMatch(rootReadme, /do not expand it until the implementation gate is signed/i);
  assert.match(mobileRule, /simulation-backed token contract/i);
  assert.match(queue, /MVP-01/);
  assert.match(queue, /MVP-07/);
});

test("AI tabletop human-psychology gates retain peer-reviewed provenance", async () => {
  const gate = JSON.parse(await readFile(
    path.join(PROJECT_ROOT, ".designops/05-direction-validation/ai-tabletop-simulation/human-psychology-gate.json"),
    "utf8"
  ));
  const sources = new Map(gate.peerReviewedSources.map((source) => [source.id, source]));

  assert.ok(sources.size >= 1, "human-psychology gate must register peer-reviewed sources");
  for (const [id, source] of sources) {
    assert.match(source.citation, /\S/, `source ${id} must have a citation`);
    assert.match(source.doi, /^10\.\S+/, `source ${id} must have a DOI`);
    assert.match(source.url, /^https:\/\//, `source ${id} must have a stable URL`);
  }
  for (const item of gate.gates) {
    assert.ok(item.mechanismRefs.length >= 1, `simulation gate ${item.id} must name a peer-reviewed mechanism`);
    for (const ref of item.mechanismRefs) assert.ok(sources.has(ref), `simulation gate ${item.id} references unknown source ${ref}`);
  }
});

test("simulation-backed handoff is complete, non-deceptive, and unblocks only the fixture MVP", async () => {
  const root = path.join(PROJECT_ROOT, ".designops");
  const matrix = JSON.parse(await readFile(path.join(root, "05-direction-validation/ai-tabletop-simulation/simulation-matrix.json"), "utf8"));
  const decision = JSON.parse(await readFile(path.join(root, "11-simulation-owner-handoff-decision.json"), "utf8"));
  const ledger = JSON.parse(await readFile(path.join(root, "05-direction-validation/simulation-evidence-ledger.json"), "utf8"));
  const catalog = await readFile(path.join(PROJECT_ROOT, "apps/mobile/src/content/catalog.js"), "utf8");
  const agents = await readFile(path.join(PROJECT_ROOT, "AGENTS.md"), "utf8");
  const status = await readFile(path.join(root, "mvp-build-status.md"), "utf8");

  assert.equal(matrix.status, "locked-qualitative-simulation-not-human-evidence");
  assert.equal(matrix.cells.length, 48, "2 models × 4 conditions × 6 psychology gates must remain locked");
  const expectedModels = new Set(["room-beacon", "private-relay"]);
  const expectedConditions = new Set(matrix.conditions.map((condition) => condition.id));
  const expectedGates = new Set(["salient-context-and-truth", "one-intended-commit", "dissent-before-consensus", "noise-and-memory-budget", "role-privacy-and-access-parity", "repair-without-shame"]);
  const observed = new Set();
  for (const cell of matrix.cells) {
    assert.ok(expectedModels.has(cell.model), `unknown model ${cell.model}`);
    assert.ok(expectedConditions.has(cell.condition), `unknown condition ${cell.condition}`);
    assert.ok(expectedGates.has(cell.gate), `unknown gate ${cell.gate}`);
    assert.match(cell.risk, /\S/);
    assert.match(cell.safeConstraint, /\S/);
    assert.match(cell.countermodelComparison, /\S/);
    assert.equal(cell.limitation, "not human evidence");
    observed.add(`${cell.model}/${cell.condition}/${cell.gate}`);
  }
  assert.equal(observed.size, 48, "each model/condition/gate cell must occur exactly once");
  assert.equal(ledger.status, "simulation-backed-owner-decision");
  assert.ok(ledger.evidenceClasses.every((item) => item.permittedConclusion && item.prohibitedConclusion));

  for (const record of decision.evidenceRecords) {
    const content = await readFile(path.join(PROJECT_ROOT, record.path), "utf8");
    assert.equal(digest(content), record.sha256, `stale owner-decision evidence: ${record.path}`);
  }
  assert.ok(decision.scope.included.includes("apps/mobile/"));
  // Amended 2026-08-04: authentic public-figure cards are admitted, but only
  // through the content pipeline. What stays excluded is the unvetted path —
  // a card that reaches the bundle without provenance, approvals and gates.
  assert.ok(decision.scope.excluded.includes("unvetted public-figure cards"));
  assert.ok(!decision.scope.excluded.includes("authentic playable public-figure cards"));
  // The amendment must stay on the record rather than being a silent edit.
  assert.ok(
    decision.scope.amendments?.some((entry) => entry.authority === "owner decision" && entry.date === "2026-08-04"),
    "the scope change must be recorded as a dated owner amendment",
  );
  assert.match(agents, /not an MVP build blocker/);
  assert.match(status, /What is not an MVP prerequisite/);
  assert.match(catalog, /fixtureOnly: true/);
  assert.equal(isPlayableCard({
    publicFigure: true,
    contentState: "authentic",
    sourceRecord: { retained: false, url: "https://example.invalid/source" },
    editorialApprovals: ["one"]
  }), false, "an unapproved public-figure record must never be playable");

  const artifactText = [
    JSON.stringify(matrix),
    JSON.stringify(ledger),
    await readFile(path.join(root, "06-content-state-map.json"), "utf8"),
    await readFile(path.join(root, "07-design-dna.json"), "utf8"),
    await readFile(path.join(root, "proposal-spec.md"), "utf8"),
    await readFile(path.join(root, "demo-spec.md"), "utf8")
  ].join("\n");
  assert.doesNotMatch(artifactText, /participants?\s+(said|reported|observed|completed|preferred)/i, "simulation drafts must not fabricate participant evidence");
  assert.doesNotMatch(artifactText, /"signature"\s*:\s*"|"signedAt"\s*:/i, "simulation drafts must not create a signed review");
  assert.doesNotMatch(artifactText, /release (is )?(ready|approved)/i, "simulation drafts must not weaken release evidence requirements");
});
