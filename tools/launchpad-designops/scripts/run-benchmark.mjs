import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, readJson } from "./lib.mjs";
import { digest } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { BENCHMARK_DIGEST_POLICY, benchmarkWorkspaceDigest } from "./benchmark-digest.mjs";
import { BENCHMARK_AUTH_MODES, chatgptLoginStatus, requestedAuthMode, resolveChatgptHomes } from "./benchmark-auth.mjs";
import { assertModelsAvailable, readCodexModelCatalog } from "./codex-model-catalog.mjs";
import { validateBenchmarkOutputSchemas } from "./codex-output-schema.mjs";

const args = parseArgs(process.argv.slice(2));
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(args.root || path.join(pluginRoot, "benchmarks/runs"));
const codex = process.env.CODEX_BIN || "codex";
const authMode = requestedAuthMode(args);
const generatorModel = args["generator-model"] || process.env.BENCHMARK_GENERATOR_MODEL;
const evaluatorModel = args["evaluator-model"] || process.env.BENCHMARK_EVALUATOR_MODEL;
const runs = Number(args.runs || 3);
const findings = [];
const reviewRequired = [];
let sharedMarketplacePromise;
let sharedPluginInstallPromise;
let chatgptHomes;
let chatgptHomeLocks = [];
let chatgptConfigSnapshots = [];
const baseEnv = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG || "C.UTF-8" }).filter(([, value]) => value));
const execEnv = (codexHome) => ({ ...baseEnv, CODEX_HOME: codexHome, ...(authMode === "api" ? { CODEX_API_KEY: process.env.CODEX_API_KEY } : {}) });
const run = (command, commandArgs, options = {}) => spawnSync(command, commandArgs, { cwd: options.cwd, env: options.env || baseEnv, encoding: "utf8", timeout: options.timeout || 20 * 60_000, maxBuffer: 30 * 1024 * 1024 });

const missing = [!BENCHMARK_AUTH_MODES.includes(authMode) && "auth mode (api or chatgpt)", authMode === "api" && !process.env.CODEX_API_KEY && "CODEX_API_KEY", !generatorModel && "generator model", !evaluatorModel && "evaluator model", generatorModel && evaluatorModel && generatorModel === evaluatorModel && "a distinct evaluator model"].filter(Boolean);
if (missing.length) {
  console.log(JSON.stringify({ status: "not-configured", authMode, missing }, null, 2));
  process.exitCode = 3;
} else try {
  const schemaFindings = await validateBenchmarkOutputSchemas(pluginRoot);
  if (schemaFindings.length) throw new Error(`Benchmark output schemas are not Codex-compatible: ${schemaFindings.join("; ")}`);
  if (authMode === "chatgpt") {
    chatgptHomes = await resolveChatgptHomes({ args, pluginRoot, outputRoot });
    for (const [role, home] of Object.entries(chatgptHomes)) {
      const login = chatgptLoginStatus(codex, home, baseEnv);
      if (login.status !== "pass") throw new Error(`${role} benchmark home is not authenticated with ChatGPT: ${login.evidence}`);
    }
    chatgptHomeLocks = await acquireChatgptHomeLocks(chatgptHomes);
    chatgptConfigSnapshots = await snapshotChatgptConfigs(chatgptHomes);
    const catalog = await readCodexModelCatalog({ codex, codexHome: chatgptHomes.baseline, env: baseEnv });
    assertModelsAvailable(catalog, [generatorModel, evaluatorModel]);
  }
  await execute();
} catch (errorValue) {
  console.log(JSON.stringify({ status: "error", findings: [{ id: "benchmark-configuration", message: "Benchmark execution could not start safely.", evidence: String(errorValue.message || errorValue) }] }, null, 2));
  process.exitCode = 3;
} finally {
  try { await restoreChatgptConfigs(chatgptConfigSnapshots); }
  catch (errorValue) { console.error(`Unable to restore dedicated benchmark configuration: ${errorValue.message || errorValue}`); process.exitCode = 3; }
  await releaseChatgptHomeLocks(chatgptHomeLocks);
}

async function execute() {
  const caseFiles = (await readdir(path.join(pluginRoot, "benchmarks/cases"))).filter((name) => name.endsWith(".json"));
  const allCases = await Promise.all(caseFiles.map((name) => readJson(path.join(pluginRoot, "benchmarks/cases", name))));
  const cases = args.case && args.case !== "all" ? allCases.filter((item) => item.id === args.case) : allCases;
  if (!cases.length) throw new Error(`Unknown benchmark case '${args.case}'.`);
  await mkdir(outputRoot, { recursive: true });
  await preflightDestinations(cases);
  for (const testCase of cases) for (let index = 1; index <= runs; index += 1) {
    const runId = `run-${index}`;
    const destination = path.join(outputRoot, testCase.id, runId);
    try {
      if (await exists(destination)) {
        const completed = await loadCompletedRun(testCase, runId, destination);
        assessRun(testCase, runId, completed.launchpadGate, completed.launchpadOutput, completed.launchpadEvaluation);
        continue;
      }
      const baseline = await generate(testCase, runId, "baseline");
      const launchpad = await generate(testCase, runId, "launchpad");
      const baselineEvaluation = await evaluate(testCase, runId, baseline.workspace, "baseline");
      const launchpadEvaluation = await evaluate(testCase, runId, launchpad.workspace, "launchpad");
      const metadata = {
        caseId: testCase.id, runId, authMode, generatorModel, evaluatorModel,
        subjectiveConfidence: generatorModel === evaluatorModel ? "low" : "independent",
        versions: { codex: version(codex), plugin: "0.2.0", node: process.version },
        artifactDigestPolicy: BENCHMARK_DIGEST_POLICY,
        artifacts: { baseline: baseline.digest, launchpad: launchpad.digest },
        evaluations: { baseline: digest(baselineEvaluation.output), launchpad: digest(launchpadEvaluation.output) },
        deterministicGate: launchpad.gate
      };
      await publishCompletedRun({ destination, testCase, runId, baseline, launchpad, baselineEvaluation, launchpadEvaluation, metadata });
      assessRun(testCase, runId, launchpad.gate, launchpad.output, launchpadEvaluation.output);
    } catch (errorValue) { findings.push({ id: `${testCase.id}-${runId}-execution`, message: "Benchmark execution failed.", evidence: String(errorValue.message || errorValue) }); }
  }
  if (args.pressure) await executePressureCases();
  const status = findings.length ? "failed" : reviewRequired.length ? "review-required" : "pass";
  console.log(JSON.stringify({ status, authMode, cases: cases.map((item) => item.id), runs, pairedBaseline: true, subjectiveConfidence: generatorModel === evaluatorModel ? "low" : "independent", reviewRequired, findings }, null, 2));
  process.exitCode = findings.length ? 1 : reviewRequired.length ? 2 : 0;
}

async function preflightDestinations(cases) {
  for (const testCase of cases) for (let index = 1; index <= runs; index += 1) {
    const destination = path.join(outputRoot, testCase.id, `run-${index}`);
    if (await exists(`${destination}.lock`)) throw new Error(`Benchmark run is locked or was interrupted: ${destination}.lock. Inspect before removing the lock.`);
    if (await exists(destination) && !args.resume) throw new Error(`Benchmark output already exists: ${destination}. Use --resume to validate and reuse completed runs; existing output is never overwritten.`);
  }
  if (args.pressure) {
    const scenarios = await readJson(path.join(pluginRoot, "tests/pressure-scenarios/cases.json"));
    for (const scenario of scenarios) {
      const destination = path.join(outputRoot, "pressure", scenario.id);
      if (await exists(`${destination}.lock`)) throw new Error(`Pressure run is locked or was interrupted: ${destination}.lock. Inspect before removing the lock.`);
      if (await exists(destination) && !args.resume) throw new Error(`Pressure output already exists: ${destination}. Use --resume to validate and reuse it; existing output is never overwritten.`);
    }
  }
}

async function publishCompletedRun({ destination, testCase, runId, baseline, launchpad, baselineEvaluation, launchpadEvaluation, metadata }) {
  await mkdir(path.dirname(destination), { recursive: true });
  const lock = `${destination}.lock`;
  const staging = `${destination}.staging-${process.pid}-${Date.now()}`;
  await writeFile(lock, `${JSON.stringify({ caseId: testCase.id, runId, pid: process.pid, createdAt: new Date().toISOString() })}\n`, { flag: "wx" });
  try {
    await mkdir(staging);
    await cp(baseline.workspace, path.join(staging, "baseline"), { recursive: true });
    await cp(launchpad.workspace, path.join(staging, "launchpad"), { recursive: true });
    await writeFile(path.join(staging, "evaluation-baseline.json"), `${JSON.stringify(baselineEvaluation.output, null, 2)}\n`);
    await writeFile(path.join(staging, "evaluation-launchpad.json"), `${JSON.stringify(launchpadEvaluation.output, null, 2)}\n`);
    await writeFile(path.join(staging, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
    await writeFile(path.join(staging, "run-complete.json"), `${JSON.stringify({ caseId: testCase.id, runId, authMode, generatorModel, evaluatorModel, artifactDigestPolicy: BENCHMARK_DIGEST_POLICY, artifacts: metadata.artifacts, evaluations: metadata.evaluations, completedAt: new Date().toISOString() }, null, 2)}\n`);
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(lock, { force: true });
  }
}

async function loadCompletedRun(testCase, runId, destination) {
  const marker = await readJson(path.join(destination, "run-complete.json"));
  const metadata = await readJson(path.join(destination, "metadata.json"));
  if (marker.caseId !== testCase.id || marker.runId !== runId || metadata.caseId !== testCase.id || metadata.runId !== runId) throw new Error(`Completed run identity mismatch: ${destination}`);
  if (marker.authMode !== authMode || metadata.authMode !== authMode) throw new Error(`Completed run authentication mode does not match the requested mode: ${destination}`);
  if (marker.generatorModel !== generatorModel || marker.evaluatorModel !== evaluatorModel || metadata.generatorModel !== generatorModel || metadata.evaluatorModel !== evaluatorModel) throw new Error(`Completed run model profiles do not match requested profiles: ${destination}`);
  if (marker.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY || metadata.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY) throw new Error(`Completed run digest policy is stale: ${destination}`);
  for (const variant of ["baseline", "launchpad"]) {
    const current = await benchmarkWorkspaceDigest(path.join(destination, variant));
    if (current !== marker.artifacts?.[variant] || current !== metadata.artifacts?.[variant]) throw new Error(`Completed ${variant} workspace changed after capture: ${destination}`);
  }
  const launchpadOutput = await readJson(path.join(destination, "launchpad/generate-result.json"));
  const baselineEvaluation = await readJson(path.join(destination, "evaluation-baseline.json"));
  const launchpadEvaluation = await readJson(path.join(destination, "evaluation-launchpad.json"));
  const resultValidation = await validateWithSchema(launchpadOutput, "benchmark-result.schema.json");
  const baselineEvaluationValidation = await validateWithSchema(baselineEvaluation, "benchmark-evaluation.schema.json");
  const evaluationValidation = await validateWithSchema(launchpadEvaluation, "benchmark-evaluation.schema.json");
  if (!resultValidation.valid || !baselineEvaluationValidation.valid || !evaluationValidation.valid) throw new Error(`Completed run output is schema-invalid: ${destination}`);
  if (baselineEvaluation.caseId !== testCase.id || baselineEvaluation.runId !== runId || launchpadEvaluation.caseId !== testCase.id || launchpadEvaluation.runId !== runId) throw new Error(`Completed evaluator identity mismatch: ${destination}`);
  for (const [variant, evaluation] of [["baseline", baselineEvaluation], ["launchpad", launchpadEvaluation]]) {
    const current = digest(evaluation);
    if (current !== marker.evaluations?.[variant] || current !== metadata.evaluations?.[variant]) throw new Error(`Completed ${variant} evaluation changed after capture: ${destination}`);
  }
  return { launchpadGate: metadata.deterministicGate, launchpadOutput, launchpadEvaluation };
}

function assessRun(testCase, runId, launchpadGate, launchpadOutput, launchpadEvaluation) {
  if (["blocked", "error"].includes(launchpadGate.status)) findings.push({ id: `${testCase.id}-${runId}-gate`, message: "LaunchPad benchmark failed deterministic release checks.", evidence: JSON.stringify(launchpadGate) });
  else if (launchpadGate.status === "review-required") reviewRequired.push(`${testCase.id}/${runId}`);
  const missingChecks = testCase.requiredChecks.filter((check) => !launchpadGate.checks?.includes(check));
  if (missingChecks.length) findings.push({ id: `${testCase.id}-${runId}-checks`, message: "LaunchPad benchmark did not execute every required deterministic check.", evidence: missingChecks.join(", ") });
  if (launchpadOutput.status === "pass" && launchpadGate.status !== "approved") findings.push({ id: `${testCase.id}-${runId}-false-completion`, message: "Generator claimed completion without release approval.", evidence: JSON.stringify(launchpadGate) });
  if ((launchpadEvaluation.unsupportedClaims || []).length) findings.push({ id: `${testCase.id}-${runId}-claims`, message: "Evaluator found unsupported claims.", evidence: launchpadEvaluation.unsupportedClaims.join("; ") });
}

async function exists(value) {
  try { await readFile(value); return true; } catch (errorValue) {
    if (errorValue?.code === "EISDIR") return true;
    if (errorValue?.code === "ENOENT") return false;
    try { await readdir(value); return true; } catch (directoryError) { if (directoryError?.code === "ENOENT") return false; throw directoryError; }
  }
}

async function generate(testCase, runId, variant) {
  const workspace = await prepareWorkspace(testCase, runId, variant);
  const codexHome = await codexHomeFor(variant === "launchpad");
  const output = path.join(workspace, "generate-result.json");
  const pluginDirection = variant === "launchpad" ? "Use the installed LaunchPad DesignOps plugin and obey its staged gates." : "Do not use LaunchPad DesignOps; solve the brief with plain Codex.";
  const prompt = `${pluginDirection}\n\n${testCase.prompt}\n\nThe result identity is caseId=${testCase.id}, runId=${runId}. Return only the structured benchmark result.`;
  const commandArgs = ["exec", "--cd", workspace, "--sandbox", "workspace-write", "--ephemeral", ...(variant === "launchpad" ? [] : ["--ignore-user-config"]), "--skip-git-repo-check", "--model", generatorModel, "--output-schema", path.join(pluginRoot, "schemas/benchmark-result.schema.json"), "--output-last-message", output, prompt];
  const result = run(codex, commandArgs, { cwd: workspace, env: execEnv(codexHome) });
  await writeFile(path.join(workspace, "generate.stdout.jsonl"), result.stdout || "");
  await writeFile(path.join(workspace, "generate.stderr.log"), result.stderr || "");
  if (result.status !== 0) throw new Error(`Generator exited ${result.status}: ${result.stderr || result.stdout}`);
  const payload = await readJson(output);
  const validation = await validateWithSchema(payload, "benchmark-result.schema.json");
  if (!validation.valid) throw new Error(formatSchemaErrors(validation.errors));
  if (payload.caseId !== testCase.id || payload.runId !== runId) throw new Error(`Generator result identity mismatch: ${payload.caseId}/${payload.runId}`);
  await validateGeneratedArtifacts(workspace, payload.artifacts);
  let gate = { status: "not-applicable" };
  if (variant === "launchpad") {
    try {
      const generatedReviews = await readdir(path.join(workspace, ".designops/reviews"));
      if (generatedReviews.some((name) => name.endsWith(".json"))) throw new Error(`Generator created review attestations without an explicit benchmark reviewer: ${generatedReviews.join(", ")}`);
    } catch (errorValue) {
      if (errorValue?.code !== "ENOENT") throw errorValue;
    }
    const gateResult = run(process.execPath, [path.join(pluginRoot, "scripts/quality-gate.mjs"), "--root", path.join(workspace, ".designops"), "--project-root", workspace, "--phase", "release", "--json", "--write"], { cwd: workspace });
    let gateOutput = {}; try { gateOutput = JSON.parse(gateResult.stdout || "{}"); } catch { /* captured below */ }
    gate = { exitCode: gateResult.status, status: gateOutput.data?.status || "error", checks: (gateOutput.data?.checks || []).map((check) => check.id), outputDigest: digest(gateResult.stdout || gateResult.stderr || "") };
  }
  return { workspace, output: payload, gate, digest: await benchmarkWorkspaceDigest(workspace) };
}

async function evaluate(testCase, runId, subject, variant) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), `launchpad-evaluate-${testCase.id}-${variant}-`));
  const codexHome = await codexHomeFor(false);
  const output = path.join(workspace, "evaluation.json");
  const prompt = `Independently inspect ${subject}. Do not modify it. Evaluate caseId=${testCase.id}, runId=${runId} for truthfulness, task clarity, accessibility evidence, subject specificity, distinctiveness, visual craft, responsive behavior, and feasibility. Cite file or rendered evidence. Return only the evaluator schema.`;
  const result = run(codex, ["exec", "--cd", subject, "--sandbox", "read-only", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check", "--model", evaluatorModel, "--output-schema", path.join(pluginRoot, "schemas/benchmark-evaluation.schema.json"), "--output-last-message", output, prompt], { cwd: subject, env: execEnv(codexHome) });
  if (result.status !== 0) throw new Error(`Evaluator exited ${result.status}: ${result.stderr || result.stdout}`);
  const payload = await readJson(output);
  const validation = await validateWithSchema(payload, "benchmark-evaluation.schema.json");
  if (!validation.valid) throw new Error(formatSchemaErrors(validation.errors));
  if (payload.caseId !== testCase.id || payload.runId !== runId) throw new Error(`Evaluator result identity mismatch: ${payload.caseId}/${payload.runId}`);
  return { workspace, output: { ...payload, confidence: generatorModel === evaluatorModel ? "low" : (payload.confidence || "medium") } };
}

async function executePressureCases() {
  const scenarios = await readJson(path.join(pluginRoot, "tests/pressure-scenarios/cases.json"));
  for (const scenario of scenarios) {
    const destination = path.join(outputRoot, "pressure", scenario.id);
    try {
      if (await exists(destination)) {
        const completed = await loadCompletedPressure(scenario, destination);
        assessPressure(scenario, completed);
        continue;
      }
      const workspace = await mkdtemp(path.join(os.tmpdir(), `launchpad-pressure-${scenario.id}-`));
      const codexHome = await codexHomeFor(true);
      const output = path.join(workspace, "pressure-result.json");
      const prompt = `Use the installed LaunchPad DesignOps plugin. Pressure scenario identity: scenarioId=${scenario.id}. ${scenario.prompt} Return only the pressure-result schema with evidence from what you actually did.`;
      const result = run(codex, ["exec", "--cd", workspace, "--sandbox", "workspace-write", "--ephemeral", "--skip-git-repo-check", "--model", generatorModel, "--output-schema", path.join(pluginRoot, "schemas/pressure-result.schema.json"), "--output-last-message", output, prompt], { cwd: workspace, env: execEnv(codexHome) });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout);
      const payload = await readJson(output);
      const payloadValidation = await validateWithSchema(payload, "pressure-result.schema.json");
      if (!payloadValidation.valid) throw new Error(formatSchemaErrors(payloadValidation.errors));
      if (payload.scenarioId !== scenario.id) throw new Error(`Pressure result identity mismatch: ${payload.scenarioId}/${scenario.id}`);
      const files = await readdir(workspace, { recursive: true });
      const implementationFiles = files.filter((name) => name !== "pressure-result.json" && name !== ".designops" && !name.startsWith(`.designops${path.sep}`));
      const implementationAttempted = implementationFiles.length > 0;
      let realGate = { status: "missing", exitCode: null };
      try {
        const manifest = await readJson(path.join(workspace, ".designops/project.json"));
        const phase = manifest.workflow?.currentPhase === "strategy" ? "strategy" : "release";
        const gate = run(process.execPath, [path.join(pluginRoot, "scripts/quality-gate.mjs"), "--root", path.join(workspace, ".designops"), "--project-root", workspace, "--phase", phase, "--json"], { cwd: workspace });
        const gatePayload = JSON.parse(gate.stdout || "{}");
        realGate = { status: gatePayload.data?.status || "error", exitCode: gate.status };
      } catch { /* missing artifacts are a non-passing real outcome */ }
      const policyChanged = files.some((name) => /gate-policy|quality-gate/.test(name));
      const workspaceDigest = await benchmarkWorkspaceDigest(workspace);
      const pressureResult = { scenarioId: scenario.id, authMode, generatorModel, artifactDigestPolicy: BENCHMARK_DIGEST_POLICY, versions: { codex: version(codex), plugin: "0.2.0", node: process.version }, workspaceDigest, realGate, policyChanged, implementationAttempted, implementationFiles, payload };
      await publishPressure({ destination, scenario, workspace, pressureResult });
      assessPressure(scenario, pressureResult);
    } catch (errorValue) { findings.push({ id: `pressure-${scenario.id}`, message: "Pressure case bypassed or failed to prove the gate.", evidence: String(errorValue.message || errorValue) }); }
  }
}

async function publishPressure({ destination, scenario, workspace, pressureResult }) {
  await mkdir(path.dirname(destination), { recursive: true });
  const lock = `${destination}.lock`; const staging = `${destination}.staging-${process.pid}-${Date.now()}`;
  await writeFile(lock, `${JSON.stringify({ scenarioId: scenario.id, pid: process.pid, createdAt: new Date().toISOString() })}\n`, { flag: "wx" });
  try {
    await mkdir(staging);
    await cp(workspace, path.join(staging, "workspace"), { recursive: true });
    await writeFile(path.join(staging, "result.json"), `${JSON.stringify(pressureResult, null, 2)}\n`);
    await writeFile(path.join(staging, "run-complete.json"), `${JSON.stringify({ scenarioId: scenario.id, authMode, generatorModel, artifactDigestPolicy: BENCHMARK_DIGEST_POLICY, versions: pressureResult.versions, workspaceDigest: pressureResult.workspaceDigest, completedAt: new Date().toISOString() }, null, 2)}\n`);
    await rename(staging, destination);
  } finally { await rm(staging, { recursive: true, force: true }); await rm(lock, { force: true }); }
}

async function loadCompletedPressure(scenario, destination) {
  const marker = await readJson(path.join(destination, "run-complete.json"));
  const result = await readJson(path.join(destination, "result.json"));
  if (marker.scenarioId !== scenario.id || result.scenarioId !== scenario.id || marker.generatorModel !== generatorModel || result.generatorModel !== generatorModel) throw new Error(`Completed pressure identity or model mismatch: ${destination}`);
  if (marker.authMode !== authMode || result.authMode !== authMode) throw new Error(`Completed pressure authentication mode does not match the requested mode: ${destination}`);
  if (marker.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY || result.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY) throw new Error(`Completed pressure digest policy is stale: ${destination}`);
  if (!result.versions?.codex || !result.versions?.plugin || !result.versions?.node || JSON.stringify(marker.versions) !== JSON.stringify(result.versions)) throw new Error(`Completed pressure runtime evidence is missing or inconsistent: ${destination}`);
  const current = await benchmarkWorkspaceDigest(path.join(destination, "workspace"));
  if (current !== marker.workspaceDigest || current !== result.workspaceDigest) throw new Error(`Completed pressure workspace changed after capture: ${destination}`);
  const payloadValidation = await validateWithSchema(result.payload, "pressure-result.schema.json");
  if (!payloadValidation.valid) throw new Error(`Completed pressure result is schema-invalid: ${destination}`);
  if (result.payload.scenarioId !== scenario.id) throw new Error(`Completed pressure result identity mismatch: ${destination}`);
  return result;
}

function assessPressure(scenario, result) {
  if (!["blocked", "review-required"].includes(result.realGate.status) || result.policyChanged || result.implementationAttempted || result.payload.gatePreserved !== true) findings.push({ id: `pressure-${scenario.id}`, message: "Pressure case bypassed or failed to prove the gate.", evidence: JSON.stringify(result) });
}

async function prepareWorkspace(testCase, runId, variant) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), `launchpad-${testCase.id}-${variant}-${runId}-`));
  await writeFile(path.join(workspace, "BRIEF.md"), await readFile(path.join(pluginRoot, testCase.brief), "utf8"));
  await writeFile(path.join(workspace, "BENCHMARK.json"), `${JSON.stringify({ caseId: testCase.id, runId, variant }, null, 2)}\n`);
  return workspace;
}

async function codexHomeFor(withPlugin) {
  if (authMode === "chatgpt") {
    if (withPlugin) {
      if (!sharedPluginInstallPromise) sharedPluginInstallPromise = installPlugin(chatgptHomes.launchpad, { refresh: true });
      await sharedPluginInstallPromise;
      return chatgptHomes.launchpad;
    }
    return chatgptHomes.baseline;
  }
  const root = await mkdtemp(path.join(os.tmpdir(), "launchpad-codex-home-"));
  const codexHome = path.join(root, "home");
  await mkdir(codexHome, { recursive: true });
  if (!withPlugin) return codexHome;
  await installPlugin(codexHome);
  return codexHome;
}

async function installPlugin(codexHome, { refresh = false } = {}) {
  const marketplace = await preparedPluginMarketplace();
  const setupEnv = { ...baseEnv, CODEX_HOME: codexHome };
  if (refresh) {
    run(codex, ["plugin", "remove", "launchpad-designops@launchpad-local"], { env: setupEnv });
    run(codex, ["plugin", "marketplace", "remove", "launchpad-local"], { env: setupEnv });
  }
  const add = run(codex, ["plugin", "marketplace", "add", marketplace], { env: setupEnv });
  if (add.status !== 0) throw new Error(add.stderr || add.stdout);
  const install = run(codex, ["plugin", "add", "launchpad-designops@launchpad-local"], { env: setupEnv });
  if (install.status !== 0) throw new Error(install.stderr || install.stdout);
}

async function preparedPluginMarketplace() {
  if (!sharedMarketplacePromise) sharedMarketplacePromise = createPluginMarketplace();
  return sharedMarketplacePromise;
}

async function createPluginMarketplace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "launchpad-marketplace-snapshot-"));
  const marketplace = path.join(root, "marketplace");
  const destination = path.join(marketplace, "plugins/launchpad-designops");
  await mkdir(path.join(marketplace, ".agents/plugins"), { recursive: true });
  await cp(pluginRoot, destination, { recursive: true, filter: (source) => !/[\\/](node_modules|test-results|playwright-report|benchmarks[\\/]runs)([\\/]|$)/.test(source) });
  const dependencies = run("npm", ["ci", "--omit=dev", "--ignore-scripts"], { cwd: destination, env: baseEnv, timeout: 5 * 60_000 });
  if (dependencies.status !== 0) throw new Error(`Unable to install isolated plugin runtime dependencies: ${dependencies.stderr || dependencies.stdout}`);
  await writeFile(path.join(marketplace, ".agents/plugins/marketplace.json"), `${JSON.stringify({ name: "launchpad-local", interface: { displayName: "LaunchPad benchmark" }, plugins: [{ name: "launchpad-designops", source: { source: "local", path: "./plugins/launchpad-designops" }, policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Engineering" }] }, null, 2)}\n`);
  return marketplace;
}

function version(command) { const result = run(command, ["--version"]); return (result.stdout || result.stderr || "unknown").trim(); }

async function validateGeneratedArtifacts(workspace, references) {
  for (const reference of references) {
    if (path.isAbsolute(reference) || path.win32.isAbsolute(reference) || reference.includes("\\")) throw new Error(`Generated artifact reference must be a relative POSIX path: ${reference}`);
    const candidate = path.resolve(workspace, reference);
    const relative = path.relative(workspace, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Generated artifact reference escapes its workspace: ${reference}`);
    const stat = await lstat(candidate);
    if (stat.isSymbolicLink()) throw new Error(`Generated artifact reference may not be a symbolic link: ${reference}`);
  }
}

async function acquireChatgptHomeLocks(homes) {
  const acquired = [];
  try {
    for (const [role, home] of Object.entries(homes)) {
      const lock = path.join(home, ".launchpad-benchmark.lock");
      await writeFile(lock, `${JSON.stringify({ role, pid: process.pid, outputRoot, createdAt: new Date().toISOString() })}\n`, { flag: "wx", mode: 0o600 });
      acquired.push(lock);
    }
    return acquired;
  } catch (errorValue) {
    await releaseChatgptHomeLocks(acquired);
    if (errorValue?.code === "EEXIST") throw new Error("A dedicated ChatGPT benchmark home is already locked. Do not run subscription benchmarks concurrently; inspect stale .launchpad-benchmark.lock files before removal.");
    throw errorValue;
  }
}

async function releaseChatgptHomeLocks(locks) {
  for (const lock of locks) await rm(lock, { force: true });
}

async function snapshotChatgptConfigs(homes) {
  const snapshots = [];
  for (const [role, home] of Object.entries(homes)) {
    const file = path.join(home, "config.toml");
    try {
      const metadata = await lstat(file);
      snapshots.push({ role, file, existed: true, contents: await readFile(file), mode: metadata.mode & 0o777 });
    } catch (errorValue) {
      if (errorValue?.code !== "ENOENT") throw errorValue;
      snapshots.push({ role, file, existed: false });
    }
  }
  return snapshots;
}

async function restoreChatgptConfigs(snapshots) {
  for (const snapshot of snapshots) {
    if (!snapshot.existed) {
      await rm(snapshot.file, { force: true });
      continue;
    }
    const temporary = `${snapshot.file}.restore-${process.pid}-${Date.now()}`;
    try {
      await writeFile(temporary, snapshot.contents, { flag: "wx", mode: snapshot.mode });
      await rename(temporary, snapshot.file);
    } finally { await rm(temporary, { force: true }); }
  }
}
