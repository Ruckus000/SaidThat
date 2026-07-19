import { mkdir, readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, readJson, printReport } from "./lib.mjs";
import { runNodeCheck } from "./check-runner.mjs";
import { GATE_VERSION, QUALIFIED_BROWSER_LANES, getGateProfile } from "./gate-policy.mjs";
import {
  computeApprovalDigest, computeImplementationDigest, computeVerificationInputDigest,
  digest, digestArtifacts, hashArtifacts, resolveContainedPath, sha256, writeJsonAtomic
} from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { assertCommandArray, assertLoopbackUrl, assertVerificationConfigSemantics } from "./command-utils.mjs";
import { verifyReviewSignature } from "./review-signature.mjs";
import { buildEvidenceIndex, requiresDirectionValidation } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const require = createRequire(import.meta.url);
const verifierTools = { node: process.version, playwright: require("playwright/package.json").version, axe: require("axe-core/package.json").version };
const root = path.resolve(args.root || ".designops");
const projectRoot = path.resolve(args["project-root"] || path.dirname(root));
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const reportRelative = args.report || "09-review-report.json";
const reportPath = path.resolve(root, reportRelative);
const reportPathSafe = !path.isAbsolute(reportRelative) && !path.win32.isAbsolute(reportRelative) && !reportRelative.includes("\\") && !reportRelative.split("/").includes("..") && !path.relative(root, reportPath).startsWith("..");
const phase = args.phase;
const findings = [];
const checks = [];
let internalFailure = false;

const add = (id, severity, category, message, evidence, recommendation) => findings.push({
  id, severity, category, message, evidence: evidence || "No evidence supplied.", recommendation: recommendation || "Repair the condition and rerun the gate."
});
const addCheck = (id, status, required, evidence = []) => checks.push({ id, status, required, evidence });
const runId = `gate-${Date.now().toString(36)}-${process.pid}`;
let trustedReviewerKey;

if (!phase) {
  const result = { status: "error", reason: "--phase is required", exitCode: 3 };
  if (args.json) console.log(JSON.stringify(result, null, 2)); else console.error("LaunchPad quality gate: --phase is required.");
  process.exitCode = 3;
} else await main();

async function main() {
  let project;
  let profile;
  let riskTriggered = false;
  if (!reportPathSafe) {
    internalFailure = true;
    add("report-path-invalid", "P0", "configuration", "The report path must be a project-relative POSIX path inside .designops.", reportRelative);
  }
  try {
    project = await readJson(path.join(root, "project.json"));
    const manifestResult = await validateWithSchema(project, "project-manifest.schema.json");
    if (!manifestResult.valid) add("project-schema", "P0", "configuration", "Project manifest does not satisfy the 0.2 contract.", formatSchemaErrors(manifestResult.errors));
    const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
    riskTriggered = requiresDirectionValidation(requirements);
    profile = getGateProfile({ mode: project.project.mode, phase, verificationMode: project.quality.verificationMode, strategyReviewRequired: riskTriggered, directionValidationRequired: riskTriggered });
  } catch (errorValue) {
    internalFailure = true;
    add("gate-configuration", "P0", "configuration", "The gate profile or project manifest could not be loaded.", String(errorValue.message || errorValue));
  }

  if (!project || !profile) return finish({ project, profile, artifacts: {}, designDigest: digest([]), implementationDigest: null, verificationInputDigest: null, approvalDigest: digest({ error: true }) });

  const artifacts = {};
  try {
    Object.assign(artifacts, await hashArtifacts(root, project.artifacts, profile.artifactKeys));
    addCheck("provenance", "pass", true, [`${Object.keys(artifacts).length} phase artifacts hashed.`]);
  } catch (errorValue) {
    add("artifact-provenance", "P0", "provenance", "A required artifact is missing, unsafe, or unreadable.", String(errorValue.message || errorValue));
    addCheck("provenance", "fail", true, [String(errorValue.message || errorValue)]);
  }

  const checkerDefinitions = {
    schemas: ["validate-schema.mjs", ["--root", root, "--phase", phase]],
    requirements: ["validate-requirements.mjs", ["--input", artifactPath(project, "requirementsMap"), "--mode", project.project.mode]],
    territories: ["validate-territory-divergence.mjs", ["--input", artifactPath(project, "territories"), "--requirements", artifactPath(project, "requirementsMap")]],
    "selected-direction": ["validate-selected-direction.mjs", ["--input", artifactPath(project, "selectedDirection"), "--territories", artifactPath(project, "territories"), "--requirements", artifactPath(project, "requirementsMap")]],
    tokens: ["validate-token-contract.mjs", ["--tokens", artifactPath(project, "tokens")]],
    "content-states": ["audit-content-states.mjs", ["--input", artifactPath(project, "contentStateMap"), "--requirements", artifactPath(project, "requirementsMap")]],
    slop: ["lint-ai-slop.mjs", ["--root", projectRoot, "--manifest", path.join(root, "project.json"), "--dna", artifactPath(project, "designDNA")]],
    "direction-validation": ["validate-direction-validation.mjs", ["--root", root, "--requirements", artifactPath(project, "requirementsMap"), "--territories", artifactPath(project, "territories"), "--selected", artifactPath(project, "selectedDirection"), "--plan", artifactPath(project, "directionValidationPlan"), "--results", artifactPath(project, "directionValidationResults"), ...(args["trusted-reviewer-key"] ? ["--trusted-reviewer-key", args["trusted-reviewer-key"]] : [])]]
  };

  for (const checkId of profile.checks) {
    if (["provenance", "verification"].includes(checkId)) continue;
    const definition = checkerDefinitions[checkId];
    if (!definition) {
      internalFailure = true;
      addCheck(checkId, "not-configured", true, ["No deterministic checker is registered."]);
      add(`check-${checkId}-missing`, "P0", "configuration", `Required check '${checkId}' is not configured.`, checkId);
      continue;
    }
    const outcome = runNodeCheck({ id: checkId, scriptRoot, script: definition[0], args: definition[1], cwd: projectRoot });
    checks.push(outcome.check);
    findings.push(...outcome.findings);
    internalFailure ||= outcome.internal;
  }

  await validateEvidenceReferences(project, profile);

  let designDigest = digestArtifacts(pickArtifacts(artifacts, profile.designArtifactKeys));
  let implementationDigest = null;
  let verificationInputDigest = null;
  let verificationReportHash = null;

  if (profile.browserRequired) {
    const verification = await verifyProjectEvidence(project, artifacts, designDigest);
    implementationDigest = verification.implementationDigest;
    verificationInputDigest = verification.verificationInputDigest;
    verificationReportHash = verification.verificationReportHash;
  } else {
    addCheck("verification", "not-applicable", false, [phase === "handoff" ? "Handoff evaluates implementation contracts before browser evidence exists." : "This gate profile does not require rendered verification."]);
  }

  const approvalDigest = computeApprovalDigest({ phase, mode: project.project.mode, designDigest, implementationDigest, verificationReportHash, policyVersion: GATE_VERSION });
  for (const upstreamPhase of profile.upstreamReviews) await validateReview({ project, reviewPhase: upstreamPhase, current: false, currentFindings: [], implementationDigest: null, verificationReportHash: null });
  const review = profile.reviewRequired
    ? await validateReview({ project, reviewPhase: phase, current: true, currentFindings: findings, approvalDigest })
    : null;

  await finish({ project, profile, artifacts, designDigest, implementationDigest, verificationInputDigest, approvalDigest, review });
}

function artifactPath(project, key) {
  return project?.artifacts?.[key] ? path.join(root, project.artifacts[key]) : path.join(root, `__missing_${key}`);
}

function pickArtifacts(artifacts, keys) {
  return Object.fromEntries(keys.filter((key) => artifacts[key]).map((key) => [key, artifacts[key]]));
}

async function validateEvidenceReferences(project, profile) {
  try {
    const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
    const evidence = buildEvidenceIndex(requirements);
    const inspect = (label, entries) => {
      for (const entry of entries) for (const ref of entry.refs || []) if (!evidence.has(ref)) add(`evidence-${label}-${entry.id}-${ref}`, "P0", "evidence", `${label} '${entry.id}' references unknown evidence.`, ref);
    };
    if (profile.artifactKeys.includes("territories")) {
      const territory = await readJson(await resolveContainedPath(root, project.artifacts.territories));
      inspect("territory", (territory.territories || []).map((item) => ({ id: item.id, refs: item.evidenceRefs })));
    }
    if (profile.artifactKeys.includes("designDNA")) {
      const dna = await readJson(await resolveContainedPath(root, project.artifacts.designDNA));
      inspect("design-dna", [{ id: "root", refs: dna.evidenceRefs }, ...(dna.exceptions || []).map((item, index) => ({ id: `exception-${index}`, refs: item.evidenceRefs }))]);
      for (const [index, exception] of (dna.exceptions || []).entries()) {
        const rule = String(exception.ruleRef || "").split(".").reduce((value, key) => value?.[key], dna);
        if (rule === undefined) add(`design-dna-exception-rule-${index}`, "P0", "evidence", "Design DNA exception references a rule that does not exist.", exception.ruleRef);
      }
    }
  } catch (errorValue) {
    add("evidence-cross-reference", "P0", "evidence", "Evidence cross-reference validation failed.", String(errorValue.message || errorValue));
  }
}

async function verifyProjectEvidence(project, artifacts, designDigest) {
  let implementationDigest = null;
  let verificationInputDigest = null;
  let verificationReportHash = artifacts.verificationReport?.sha256 || null;
  try {
    const config = await readJson(await resolveContainedPath(root, project.artifacts.verificationConfig));
    const configSchema = await validateWithSchema(config, "verification-config.schema.json");
    if (!configSchema.valid) throw new Error(`Invalid verification configuration: ${formatSchemaErrors(configSchema.errors)}`);
    assertCommandArray(config.server, "Project server");
    assertCommandArray(config.taskTest, "Primary-task test");
    assertLoopbackUrl(config.baseUrl, "baseUrl");
    assertVerificationConfigSemantics(config);
    if (!QUALIFIED_BROWSER_LANES.includes(config.lane)) {
      addCheck("verification", "not-configured", true, [`Lane '${config.lane}' is not release-qualified.`]);
      add("verification-lane-unqualified", "P0", "verification", `Lane '${config.lane}' is not browser-qualified in 0.2.`, `Qualified lanes: ${QUALIFIED_BROWSER_LANES.join(", ")}.`);
      return { implementationDigest, verificationInputDigest, verificationReportHash };
    }
    if (config.lane !== project.stack.family) throw new Error(`Verification lane '${config.lane}' does not match project lane '${project.stack.family}'.`);
    implementationDigest = await computeImplementationDigest(projectRoot, [...new Set([...config.sourceRoots, ...config.taskTest.sourceFiles])]);
    const expectedCommandDigest = digest({ server: config.server, taskTest: config.taskTest || null });
    const verifierDigest = digest({ runnerVersion: GATE_VERSION, tools: verifierTools, commandDigest: expectedCommandDigest });
    verificationInputDigest = computeVerificationInputDigest({ designDigest, implementationDigest, verificationConfigHash: artifacts.verificationConfig.sha256, verifierDigest });
    const report = await readJson(await resolveContainedPath(root, project.artifacts.verificationReport));
    const reportSchema = await validateWithSchema(report, "verification-report.schema.json");
    if (!reportSchema.valid) throw new Error(`Invalid verification report: ${formatSchemaErrors(reportSchema.errors)}`);
    const evidence = [];
    if (report.status !== "pass") evidence.push(`status=${report.status}`);
    if (report.lane !== config.lane) evidence.push(`lane=${report.lane}`);
    if (report.implementationDigest !== implementationDigest) evidence.push("implementation digest is stale");
    if (report.verificationInputDigest !== verificationInputDigest) evidence.push("verification input digest is stale");
    if (report.runner.version !== GATE_VERSION) evidence.push(`runner version=${report.runner.version}; expected=${GATE_VERSION}`);
    if (report.runner.commandDigest !== expectedCommandDigest) evidence.push("runner command digest is stale");
    for (const [tool, version] of Object.entries(verifierTools)) if (report.runner.tools[tool] !== version) evidence.push(`${tool} version=${report.runner.tools[tool]}; expected=${version}`);
    if (Date.parse(report.runner.generatedAt) > Date.now() + 5 * 60_000) evidence.push("verification timestamp is unreasonably in the future");
    if (report.summary.p0 !== 0) evidence.push(`p0=${report.summary.p0}`);
    const requiredRouteChecks = ["route-load", "console", "runtime", "axe", "keyboard", "focus-visible", "overflow", "image-alternatives", "form-labels", "target-sizes", "reduced-motion", "states"];
    const records = new Map();
    for (const route of report.routes) {
      const key = `${route.path}|${route.browser}|${route.viewport.width}x${route.viewport.height}`;
      if (records.has(key)) evidence.push(`duplicate route result ${key}`);
      records.set(key, route);
    }
    const expectedRecordCount = config.routes.length * config.browsers.length * config.viewports.length;
    if (report.routes.length !== expectedRecordCount) evidence.push(`route result count=${report.routes.length}; expected=${expectedRecordCount}`);
    for (const route of config.routes) for (const browser of config.browsers) for (const viewport of config.viewports) {
      const key = `${route.path}|${browser}|${viewport.width}x${viewport.height}`;
      const record = records.get(key);
      if (!record) { evidence.push(`missing route result ${key}`); continue; }
      for (const check of requiredRouteChecks) if (record.checks[check] !== "pass") evidence.push(`${key} ${check}=${record.checks[check] || "missing"}`);
      const longContentExpected = Boolean(route.stateSelectors?.["long-content"]);
      if (record.checks["long-content"] !== (longContentExpected ? "pass" : "not-applicable")) evidence.push(`${key} long-content=${record.checks["long-content"] || "missing"}`);
      const touchExpected = viewport.width <= 768;
      if (record.checks.touch !== (touchExpected ? "pass" : "not-applicable")) evidence.push(`${key} touch=${record.checks.touch || "missing"}`);
      try {
        const screenshotPath = await resolveContainedPath(root, record.screenshot.path);
        if (sha256(await readFile(screenshotPath)) !== record.screenshot.sha256) evidence.push(`${key} screenshot hash is stale`);
      } catch (errorValue) { evidence.push(`${key} screenshot is missing or unsafe: ${String(errorValue.message || errorValue)}`); }
    }
    const expectedKeys = new Set(config.routes.flatMap((route) => config.browsers.flatMap((browser) => config.viewports.map((viewport) => `${route.path}|${browser}|${viewport.width}x${viewport.height}`))));
    for (const key of records.keys()) if (!expectedKeys.has(key)) evidence.push(`unexpected route result ${key}`);
    const countedP0 = report.findings.filter((finding) => finding.severity === "P0").length;
    const countedP1 = report.findings.filter((finding) => finding.severity === "P1").length;
    if (report.summary.p0 !== countedP0) evidence.push(`summary p0=${report.summary.p0}; findings=${countedP0}`);
    if (report.summary.p1 !== countedP1) evidence.push(`summary p1=${report.summary.p1}; findings=${countedP1}`);
    if (countedP0) evidence.push(`verification report contains ${countedP0} P0 finding(s)`);
    for (const finding of report.findings.filter((item) => item.severity !== "P0")) add(`verification-${finding.id}`, finding.severity, "verification", finding.message, finding.evidence, "Inspect the rendered diagnostic and document or correct it before approval.");
    if (report.taskTest?.status !== "pass") evidence.push("project-owned primary-task test did not pass");
    const configuredTaskIds = new Set(config.routes.flatMap((route) => route.taskIds));
    for (const taskId of configuredTaskIds) if (!report.taskTest?.taskIds.includes(taskId)) evidence.push(`primary-task report omits '${taskId}'`);
    for (const modality of ["keyboard", "touch"]) if (!report.taskTest?.modalities.includes(modality)) evidence.push(`primary-task report omits '${modality}' evidence`);
    const stateMap = await readJson(await resolveContainedPath(root, project.artifacts.contentStateMap));
    const applicableStates = new Set((stateMap.states || []).filter((state) => state.applicability === "applicable").map((state) => state.name));
    const configuredStates = new Set(config.routes.flatMap((route) => Object.keys(route.stateSelectors || {})));
    for (const state of applicableStates) if (!configuredStates.has(state)) evidence.push(`applicable state '${state}' is not bound to a verification route`);
    const configuredRecovery = new Set(config.routes.flatMap((route) => Object.keys(route.recoverySelectors || {})));
    for (const state of applicableStates) if (state !== "normal" && !configuredRecovery.has(state)) evidence.push(`applicable state '${state}' has no configured recovery path`);
    const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
    const taskIds = new Set((requirements.tasks || []).map((task) => task.id));
    for (const route of config.routes) for (const taskId of route.taskIds) if (!taskIds.has(taskId)) evidence.push(`route '${route.path}' references unknown task '${taskId}'`);
    if (evidence.length) {
      addCheck("verification", "fail", true, evidence);
      add("verification-evidence-invalid", "P0", "verification", "Project verification evidence is incomplete, stale, or failing.", evidence.join("; "));
    } else addCheck("verification", "pass", true, [`${report.routes.length} route/browser/viewport records verified.`, verificationInputDigest]);
  } catch (errorValue) {
    addCheck("verification", "fail", true, [String(errorValue.message || errorValue)]);
    add("verification-invalid", "P0", "verification", "Project verification could not be trusted.", String(errorValue.message || errorValue));
  }
  return { implementationDigest, verificationInputDigest, verificationReportHash };
}

async function validateReview({ project, reviewPhase, current, currentFindings, approvalDigest: suppliedDigest }) {
  const reviewKey = `${reviewPhase}Review`;
  const reviewPath = project.artifacts[reviewKey];
  if (!reviewPath) {
    if (current) return null;
    add(`review-${reviewPhase}-missing`, "P0", "review", `Required upstream ${reviewPhase} review is missing.`, reviewKey);
    return null;
  }
  try {
    const review = await readJson(await resolveContainedPath(root, reviewPath));
    const schemaResult = await validateWithSchema(review, "human-review.schema.json");
    if (!schemaResult.valid) throw new Error(formatSchemaErrors(schemaResult.errors));
    const reviewerKey = await loadTrustedReviewerKey();
    verifyReviewSignature(review, reviewerKey);
    const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
    const required = requiresDirectionValidation(requirements);
    const phaseProfile = getGateProfile({ mode: project.project.mode, phase: reviewPhase, verificationMode: project.quality.verificationMode, strategyReviewRequired: required, directionValidationRequired: required });
    const phaseArtifacts = await hashArtifacts(root, project.artifacts, phaseProfile.designArtifactKeys);
    const phaseDesignDigest = digestArtifacts(phaseArtifacts);
    const expectedDigest = suppliedDigest || computeApprovalDigest({ phase: reviewPhase, mode: project.project.mode, designDigest: phaseDesignDigest, policyVersion: GATE_VERSION });
    if (review.phase !== reviewPhase) throw new Error(`Review phase '${review.phase}' does not match '${reviewPhase}'.`);
    if (review.approvalDigest !== expectedDigest) throw new Error(`Stale approval digest: review=${review.approvalDigest} current=${expectedDigest}`);
    if (Date.parse(review.createdAt) > Date.now() + 5 * 60_000) throw new Error("Review timestamp is unreasonably in the future.");
    const allowedEvidence = new Set([
      ...phaseProfile.artifactKeys,
      ...phaseProfile.artifactKeys.map((key) => key === "project" ? "project.json" : project.artifacts[key]).filter(Boolean),
      ...currentFindings.map((finding) => finding.id)
    ]);
    for (const ref of review.evidenceRefs) if (!allowedEvidence.has(String(ref))) throw new Error(`Review evidence reference is unresolved: ${ref}`);
    if (review.decision === "reject") {
      add(`review-${reviewPhase}-rejected`, "P0", "review", `${reviewPhase} review rejected the current artifacts.`, review.rationale);
      return review;
    }
    for (const dimension of phaseProfile.dimensions) if ((review.dimensions[dimension] || 0) < 4) add(`review-${reviewPhase}-${dimension}`, "P0", "review", `${reviewPhase} review did not meet the '${dimension}' floor.`, `score=${review.dimensions[dimension] || "missing"}`);
    if (current) {
      const retained = currentFindings.filter((finding) => finding.severity === "P1" && !finding.exception && !review.acknowledgedFindings.includes(finding.id));
      if (retained.length) add(`review-${reviewPhase}-unacknowledged`, "P0", "review", "The review does not acknowledge retained advisory findings.", retained.map((finding) => finding.id).join(", "));
    }
    return review;
  } catch (errorValue) {
    if (current && errorValue?.code === "ENOENT") return null;
    add(`review-${reviewPhase}-invalid`, "P0", "review", `${reviewPhase} review is invalid or stale.`, String(errorValue.message || errorValue));
    return null;
  }
}

async function loadTrustedReviewerKey() {
  if (trustedReviewerKey) return trustedReviewerKey;
  const configured = args["trusted-reviewer-key"];
  if (!configured) {
    internalFailure = true;
    throw new Error("A signed review exists, but --trusted-reviewer-key was not supplied.");
  }
  const keyPath = await realpath(path.resolve(configured));
  const projectReal = await realpath(projectRoot);
  const relative = path.relative(projectReal, keyPath);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    internalFailure = true;
    throw new Error("The trusted reviewer key must be anchored outside the project workspace.");
  }
  trustedReviewerKey = await readFile(keyPath, "utf8");
  return trustedReviewerKey;
}

async function finish({ project, profile, artifacts, designDigest, implementationDigest, verificationInputDigest, approvalDigest, review = null }) {
  for (const checkId of profile?.checks || []) if (!checks.some((check) => check.id === checkId)) {
    internalFailure = true;
    addCheck(checkId, "not-configured", true, ["Declared check did not execute."]);
    add(`check-${checkId}-not-executed`, "P0", "configuration", `Declared check '${checkId}' did not execute.`, checkId);
  }
  for (const check of checks) if (check.required && check.status === "not-configured") add(`check-${check.id}-required-not-configured`, "P0", "configuration", `Required check '${check.id}' is not configured.`, check.id);

  const machineBlocked = findings.some((finding) => finding.severity === "P0");
  const status = machineBlocked ? "blocked" : profile?.reviewRequired && review?.decision !== "approve" ? "review-required" : "approved";
  const report = {
    schemaVersion: "0.2", status, phase: phase || "strategy", mode: project?.project?.mode || "audit",
    provenanceNotice: "Hashes establish artifact identity and freshness only; they do not prove evidence quality, usability, or design merit.",
    findings, checks, artifacts,
    digests: { design: designDigest, implementation: implementationDigest, verificationInput: verificationInputDigest, approval: approvalDigest },
    review,
    run: { version: GATE_VERSION, runId, generatedAt: new Date().toISOString() }
  };
  const reportResult = await validateWithSchema(report, "review-report.schema.json");
  if (!reportResult.valid) {
    internalFailure = true;
    add("generated-report-invalid", "P0", "configuration", "The gate generated a report that violates its own schema.", formatSchemaErrors(reportResult.errors));
    report.status = "blocked";
    report.findings = findings;
  }
  if (args.write && reportPathSafe) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeJsonAtomic(reportPath, report);
    if (project) {
      project.workflow.gates = { ...(project.workflow.gates || {}), [phase]: { status: report.status, approvalDigest: approvalDigest || null, runId, updatedAt: new Date().toISOString() } };
      await writeJsonAtomic(path.join(root, "project.json"), project);
    }
  }
  printReport({ title: "LaunchPad DesignOps 0.2 quality gate", findings, data: { status: report.status, phase, mode: report.mode, digests: report.digests, checks: report.checks, runId }, json: Boolean(args.json) });
  process.exitCode = internalFailure ? 3 : report.status === "blocked" ? 1 : report.status === "review-required" ? 2 : 0;
}
