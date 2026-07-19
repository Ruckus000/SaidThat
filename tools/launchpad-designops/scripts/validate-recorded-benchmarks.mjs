import { access, lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, printReport, exitWith } from "./lib.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { verifyReviewSignature } from "./review-signature.mjs";
import { BENCHMARK_DIGEST_POLICY, benchmarkWorkspaceDigest } from "./benchmark-digest.mjs";
import { digest } from "./provenance.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || "benchmarks/runs");
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];
if (!args["trusted-reviewer-key"]) {
  console.error("Recorded benchmark validation requires --trusted-reviewer-key <external-public-key>.");
  process.exit(3);
}
const trustedKeyPath = await realpath(path.resolve(args["trusted-reviewer-key"]));
let benchmarkRoot = path.resolve(root);
try { benchmarkRoot = await realpath(root); } catch { /* Missing roots are reported as benchmark findings below. */ }
const pluginReal = await realpath(pluginRoot);
if (inside(benchmarkRoot, trustedKeyPath) || inside(pluginReal, trustedKeyPath)) {
  console.error("The benchmark reviewer public key must be anchored outside the benchmark output and plugin repository.");
  process.exit(3);
}
const trustedReviewerKey = await readFile(trustedKeyPath, "utf8");
const recordedGeneratorModels = new Set();
const recordedEvaluatorModels = new Set();
const recordedAuthModes = new Set();
let cases = [];
let expectedCases = [];
try {
  expectedCases = await Promise.all((await readdir(path.join(pluginRoot, "benchmarks/cases"))).filter((name) => name.endsWith(".json")).map(async (name) => JSON.parse(await readFile(path.join(pluginRoot, "benchmarks/cases", name), "utf8"))));
  const actualCases = (await readdir(root, { withFileTypes: true })).filter((item) => item.isDirectory() && item.name !== "pressure").map((item) => item.name);
  const expectedIds = expectedCases.map((item) => item.id).sort();
  const actualIds = actualCases.sort();
  for (const caseId of expectedIds.filter((id) => !actualIds.includes(id))) findings.push({ id: `${caseId}-missing-case`, severity: "P0", message: "Required benchmark domain is missing from the recorded corpus." });
  for (const caseId of actualIds.filter((id) => !expectedIds.includes(id))) findings.push({ id: `${caseId}-unknown-case`, severity: "P0", message: "Recorded corpus contains an unknown benchmark domain." });
  cases = expectedIds;
} catch (errorValue) { findings.push({ id: "recorded-root", severity: "P0", message: "Recorded benchmark root or canonical definitions are unavailable.", evidence: String(errorValue.message || errorValue) }); }
for (const caseId of cases) for (let index = 1; index <= 3; index += 1) {
  const runPath = path.join(root, caseId, `run-${index}`);
  try {
    const metadata = JSON.parse(await readFile(path.join(runPath, "metadata.json"), "utf8"));
    const marker = JSON.parse(await readFile(path.join(runPath, "run-complete.json"), "utf8"));
    if (metadata.caseId !== caseId || metadata.runId !== `run-${index}` || marker.caseId !== caseId || marker.runId !== `run-${index}`) findings.push({ id: `${caseId}-${index}-identity`, severity: "P0", message: "Recorded metadata or completion-marker identity is invalid." });
    if (!["api", "chatgpt"].includes(metadata.authMode) || marker.authMode !== metadata.authMode) findings.push({ id: `${caseId}-${index}-auth-mode`, severity: "P0", message: "Recorded authentication mode is missing, unsupported, or inconsistent." });
    if (metadata.authMode) recordedAuthModes.add(metadata.authMode);
    if (!metadata.generatorModel || !metadata.evaluatorModel || metadata.generatorModel === metadata.evaluatorModel || metadata.subjectiveConfidence !== "independent") findings.push({ id: `${caseId}-${index}-confidence`, severity: "P0", message: "Independent, explicitly recorded generator and evaluator models are required." });
    if (metadata.generatorModel) recordedGeneratorModels.add(metadata.generatorModel);
    if (metadata.evaluatorModel) recordedEvaluatorModels.add(metadata.evaluatorModel);
    if (!metadata.versions?.codex || !metadata.versions?.plugin || !metadata.versions?.node) findings.push({ id: `${caseId}-${index}-versions`, severity: "P0", message: "Recorded run lacks complete CLI, plugin, or runtime version evidence." });
    if (metadata.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY) findings.push({ id: `${caseId}-${index}-digest-policy`, severity: "P0", message: "Recorded run uses an unknown artifact digest policy.", evidence: metadata.artifactDigestPolicy || "missing" });
    if (!metadata.artifacts?.baseline || !metadata.artifacts?.launchpad) findings.push({ id: `${caseId}-${index}-pair`, severity: "P0", message: "Recorded run lacks paired artifact digests." });
    if (!metadata.evaluations?.baseline || !metadata.evaluations?.launchpad) findings.push({ id: `${caseId}-${index}-evaluations`, severity: "P0", message: "Recorded run lacks evaluator evidence digests." });
    if (marker.generatorModel !== metadata.generatorModel || marker.evaluatorModel !== metadata.evaluatorModel || marker.artifactDigestPolicy !== metadata.artifactDigestPolicy || JSON.stringify(marker.artifacts) !== JSON.stringify(metadata.artifacts) || JSON.stringify(marker.evaluations) !== JSON.stringify(metadata.evaluations)) findings.push({ id: `${caseId}-${index}-completion-marker`, severity: "P0", message: "Completion marker does not match recorded metadata." });
    for (const variant of ["baseline", "launchpad"]) {
      const currentDigest = await benchmarkWorkspaceDigest(path.join(runPath, variant));
      if (currentDigest !== metadata.artifacts?.[variant]) findings.push({ id: `${caseId}-${index}-${variant}-artifact-stale`, severity: "P0", message: "Recorded benchmark workspace changed after its artifact digest was captured.", evidence: `recorded=${metadata.artifacts?.[variant] || "missing"} current=${currentDigest}` });
    }
    for (const variant of ["baseline", "launchpad"]) {
      const generated = JSON.parse(await readFile(path.join(runPath, variant, "generate-result.json"), "utf8"));
      const generatedValidation = await validateWithSchema(generated, "benchmark-result.schema.json");
      if (!generatedValidation.valid) findings.push({ id: `${caseId}-${index}-${variant}-schema`, severity: "P0", message: "Recorded generator output is schema-invalid.", evidence: formatSchemaErrors(generatedValidation.errors) });
      else await validateGeneratedArtifacts(path.join(runPath, variant), generated.artifacts, `${caseId}-${index}-${variant}`);
      const evaluation = JSON.parse(await readFile(path.join(runPath, `evaluation-${variant}.json`), "utf8"));
      const evaluationValidation = await validateWithSchema(evaluation, "benchmark-evaluation.schema.json");
      if (!evaluationValidation.valid) findings.push({ id: `${caseId}-${index}-${variant}-evaluation-schema`, severity: "P0", message: "Recorded evaluator output is schema-invalid.", evidence: formatSchemaErrors(evaluationValidation.errors) });
      if (evaluation.caseId !== caseId || evaluation.runId !== `run-${index}`) findings.push({ id: `${caseId}-${index}-${variant}-evaluation-identity`, severity: "P0", message: "Recorded evaluator output identity does not match its run." });
      const evaluationDigest = digest(evaluation);
      if (evaluationDigest !== metadata.evaluations?.[variant]) findings.push({ id: `${caseId}-${index}-${variant}-evaluation-stale`, severity: "P0", message: "Recorded evaluator evidence changed after capture.", evidence: `recorded=${metadata.evaluations?.[variant] || "missing"} current=${evaluationDigest}` });
      if ((evaluation.unsupportedClaims || []).length) findings.push({ id: `${caseId}-${index}-${variant}-claims`, severity: "P0", message: "Recorded run contains unsupported claims.", evidence: evaluation.unsupportedClaims.join("; ") });
      if (variant === "launchpad") {
        if ((evaluation.findings || []).some((finding) => finding.severity === "P0")) findings.push({ id: `${caseId}-${index}-${variant}-evaluator-p0`, severity: "P0", message: "Recorded evaluator found a P0 quality failure.", evidence: evaluation.findings.filter((finding) => finding.severity === "P0").map((finding) => finding.message).join("; ") });
        for (const dimension of ["requirements", "taskClarity", "accessibility", "truthfulness"]) if ((evaluation.scores?.[dimension] || 0) < 4) findings.push({ id: `${caseId}-${index}-${variant}-${dimension}`, severity: "P0", message: `Critical evaluator dimension '${dimension}' is below 4/5.`, evidence: String(evaluation.scores?.[dimension] || "missing") });
        for (const dimension of ["subjectSpecificity", "distinctiveness", "visualCraft", "responsiveBehavior", "implementationFeasibility"]) if ((evaluation.scores?.[dimension] || 0) < 3) findings.push({ id: `${caseId}-${index}-${variant}-${dimension}`, severity: "P0", message: `Evaluator dimension '${dimension}' is below 3/5.`, evidence: String(evaluation.scores?.[dimension] || "missing") });
      }
    }
    const comparison = JSON.parse(await readFile(path.join(runPath, "human-comparison.json"), "utf8"));
    const comparisonValidation = await validateWithSchema(comparison, "benchmark-comparison.schema.json");
    if (!comparisonValidation.valid) findings.push({ id: `${caseId}-${index}-comparison-schema`, severity: "P0", message: "Human paired comparison is schema-invalid.", evidence: formatSchemaErrors(comparisonValidation.errors) });
    else {
      verifyReviewSignature(comparison, trustedReviewerKey);
      if (comparison.caseId !== caseId || comparison.runId !== `run-${index}`) findings.push({ id: `${caseId}-${index}-comparison-identity`, severity: "P0", message: "Human comparison identity does not match its run directory." });
      if (comparison.artifactDigests.baseline !== metadata.artifacts.baseline || comparison.artifactDigests.launchpad !== metadata.artifacts.launchpad || comparison.artifactDigests.evaluationBaseline !== metadata.evaluations?.baseline || comparison.artifactDigests.evaluationLaunchpad !== metadata.evaluations?.launchpad) findings.push({ id: `${caseId}-${index}-comparison-stale`, severity: "P0", message: "Human comparison artifact or evaluator-evidence digests are stale." });
      if (comparison.decision !== "launchpad-better") findings.push({ id: `${caseId}-${index}-comparison-decision`, severity: "P0", message: "This run does not support a LaunchPad quality-improvement claim.", evidence: comparison.decision });
      for (const dimension of ["subjectSpecificity", "originality", "visualCraft"]) if (comparison.dimensions[dimension] !== "launchpad") findings.push({ id: `${caseId}-${index}-comparison-${dimension}`, severity: "P0", message: `Human comparison did not prefer LaunchPad for '${dimension}'.`, evidence: comparison.dimensions[dimension] });
      for (const dimension of ["taskClarity", "trust", "implementationFeasibility"]) if (comparison.dimensions[dimension] === "baseline") findings.push({ id: `${caseId}-${index}-comparison-regression-${dimension}`, severity: "P0", message: `Human comparison found a LaunchPad regression in '${dimension}'.` });
      for (const reference of comparison.evidenceRefs) {
        const evidencePath = path.resolve(runPath, reference);
        if (!inside(runPath, evidencePath)) findings.push({ id: `${caseId}-${index}-comparison-evidence-path`, severity: "P0", message: "Human comparison evidence escapes the run directory.", evidence: reference });
        else try { await access(evidencePath); } catch { findings.push({ id: `${caseId}-${index}-comparison-evidence-missing`, severity: "P0", message: "Human comparison evidence does not exist.", evidence: reference }); }
      }
    }
    const launchpad = path.join(runPath, "launchpad");
    const gate = spawnSync(process.execPath, [path.join(pluginRoot, "scripts/quality-gate.mjs"), "--root", path.join(launchpad, ".designops"), "--project-root", launchpad, "--phase", "release", "--trusted-reviewer-key", trustedKeyPath, "--json"], { cwd: launchpad, encoding: "utf8", timeout: 2 * 60_000, maxBuffer: 30 * 1024 * 1024 });
    let gatePayload = {}; try { gatePayload = JSON.parse(gate.stdout || "{}"); } catch { /* status check below reports it */ }
    if (gate.status !== 0 || gatePayload.data?.status !== "approved") findings.push({ id: `${caseId}-${index}-gate`, severity: "P0", message: "Recorded run does not currently pass the real release gate.", evidence: (gate.stdout || gate.stderr || `exit ${gate.status}`).slice(-4000) });
  } catch (errorValue) { findings.push({ id: `${caseId}-${index}-missing`, severity: "P0", message: "Required recorded run evidence is missing or invalid.", evidence: String(errorValue.message || errorValue) }); }
}
if (recordedGeneratorModels.size !== 1 || recordedEvaluatorModels.size !== 1 || recordedAuthModes.size !== 1) findings.push({ id: "recorded-run-consistency", severity: "P0", message: "Every recorded run must use one consistent authentication mode, generator profile, and evaluator profile.", evidence: JSON.stringify({ authModes: [...recordedAuthModes], generators: [...recordedGeneratorModels], evaluators: [...recordedEvaluatorModels] }) });
await validatePressureCorpus();
printReport({ title: "Recorded benchmark validation", findings, data: { root, cases }, json: Boolean(args.json) });
exitWith(findings);

async function validatePressureCorpus() {
  let scenarios = [];
  try { scenarios = JSON.parse(await readFile(path.join(pluginRoot, "tests/pressure-scenarios/cases.json"), "utf8")); }
  catch (errorValue) { findings.push({ id: "pressure-definitions", severity: "P0", message: "Pressure definitions are unavailable.", evidence: String(errorValue.message || errorValue) }); return; }
  const pressureRoot = path.join(root, "pressure");
  let actual = [];
  try { actual = (await readdir(pressureRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name); }
  catch (errorValue) { findings.push({ id: "pressure-corpus", severity: "P0", message: "Recorded pressure corpus is missing.", evidence: String(errorValue.message || errorValue) }); return; }
  const expected = scenarios.map((scenario) => scenario.id);
  for (const id of expected.filter((value) => !actual.includes(value))) findings.push({ id: `pressure-${id}-missing`, severity: "P0", message: "Required pressure scenario is missing." });
  for (const id of actual.filter((value) => !expected.includes(value))) findings.push({ id: `pressure-${id}-unknown`, severity: "P0", message: "Recorded pressure corpus contains an unknown scenario." });
  for (const scenario of scenarios) {
    const destination = path.join(pressureRoot, scenario.id);
    try {
      const marker = JSON.parse(await readFile(path.join(destination, "run-complete.json"), "utf8"));
      const result = JSON.parse(await readFile(path.join(destination, "result.json"), "utf8"));
      const current = await benchmarkWorkspaceDigest(path.join(destination, "workspace"));
      const validation = await validateWithSchema(result.payload, "pressure-result.schema.json");
      if (!validation.valid) findings.push({ id: `pressure-${scenario.id}-schema`, severity: "P0", message: "Recorded pressure result is schema-invalid.", evidence: formatSchemaErrors(validation.errors) });
      if (marker.scenarioId !== scenario.id || result.scenarioId !== scenario.id || result.payload?.scenarioId !== scenario.id) findings.push({ id: `pressure-${scenario.id}-identity`, severity: "P0", message: "Recorded pressure identity is invalid." });
      if (!recordedAuthModes.has(result.authMode) || marker.authMode !== result.authMode) findings.push({ id: `pressure-${scenario.id}-auth-mode`, severity: "P0", message: "Recorded pressure authentication mode is missing or inconsistent with paired runs." });
      if (!marker.generatorModel || marker.generatorModel !== result.generatorModel || !recordedGeneratorModels.has(result.generatorModel)) findings.push({ id: `pressure-${scenario.id}-model`, severity: "P0", message: "Recorded pressure model metadata is missing, inconsistent, or differs from the paired benchmark generator." });
      if (marker.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY || result.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY) findings.push({ id: `pressure-${scenario.id}-digest-policy`, severity: "P0", message: "Recorded pressure evidence uses an unknown digest policy." });
      if (!result.versions?.codex || !result.versions?.plugin || !result.versions?.node || JSON.stringify(marker.versions) !== JSON.stringify(result.versions)) findings.push({ id: `pressure-${scenario.id}-versions`, severity: "P0", message: "Recorded pressure runtime evidence is missing or inconsistent." });
      if (current !== marker.workspaceDigest || current !== result.workspaceDigest) findings.push({ id: `pressure-${scenario.id}-stale`, severity: "P0", message: "Recorded pressure workspace changed after capture." });
      if (!["blocked", "review-required"].includes(result.realGate?.status) || result.policyChanged !== false || result.implementationAttempted !== false || result.payload?.gatePreserved !== true) findings.push({ id: `pressure-${scenario.id}-bypass`, severity: "P0", message: "Recorded pressure scenario did not preserve the real workflow gate.", evidence: JSON.stringify(result) });
    } catch (errorValue) { findings.push({ id: `pressure-${scenario.id}-invalid`, severity: "P0", message: "Recorded pressure evidence is missing or invalid.", evidence: String(errorValue.message || errorValue) }); }
  }
}

async function validateGeneratedArtifacts(workspace, references, findingPrefix) {
  for (const reference of references) {
    if (path.isAbsolute(reference) || path.win32.isAbsolute(reference) || reference.includes("\\")) { findings.push({ id: `${findingPrefix}-artifact-path`, severity: "P0", message: "Generated artifact reference must be a relative POSIX path.", evidence: reference }); continue; }
    const candidate = path.resolve(workspace, reference);
    const relative = path.relative(workspace, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) { findings.push({ id: `${findingPrefix}-artifact-escape`, severity: "P0", message: "Generated artifact reference escapes its workspace.", evidence: reference }); continue; }
    try { const stat = await lstat(candidate); if (stat.isSymbolicLink()) throw new Error("symbolic links are not accepted"); }
    catch (errorValue) { findings.push({ id: `${findingPrefix}-artifact-missing`, severity: "P0", message: "Generated artifact reference is missing or unsafe.", evidence: `${reference}: ${String(errorValue.message || errorValue)}` }); }
  }
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
