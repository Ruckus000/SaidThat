import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EnforcementError,
  PROJECT_ROOT,
  assertGateDecision,
  classifyPath,
  computeVendorDigest,
  gatePhaseForIntent,
  inferIntent,
  resolveTrustedReviewerKey,
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
  assert.equal(environment.install, "npm ci --prefix tools/launchpad-designops --omit=dev --ignore-scripts");
});
