import { access, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, printReport } from "./lib.mjs";
import { BENCHMARK_AUTH_MODES, chatgptLoginStatus, requestedAuthMode, resolveChatgptHomes } from "./benchmark-auth.mjs";
import { modelIsAvailable, readCodexModelCatalog } from "./codex-model-catalog.mjs";
import { validateBenchmarkOutputSchemas } from "./codex-output-schema.mjs";

const args = parseArgs(process.argv.slice(2));
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codex = process.env.CODEX_BIN || "codex";
const authMode = requestedAuthMode(args);
const generatorModel = args["generator-model"] || process.env.BENCHMARK_GENERATOR_MODEL || "";
const evaluatorModel = args["evaluator-model"] || process.env.BENCHMARK_EVALUATOR_MODEL || "";
const outputRoot = path.resolve(args.root || path.join(pluginRoot, "benchmarks/runs"));
const checks = [];
const check = (id, status, evidence) => checks.push({ id, status, evidence });
const baseEnv = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG || "C.UTF-8" }).filter(([, value]) => value));
const requireExecution = Boolean(args.execute || args["require-execution"]);
let chatgptHomes;
let chatgptAuthReady = false;

const help = spawnSync(codex, ["exec", "--help"], { encoding: "utf8", timeout: 10_000, env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG || "C.UTF-8" } });
if (help.status !== 0) check("codex", "not-configured", help.stderr || "Codex binary unavailable.");
else {
  const missing = ["--ephemeral", "--sandbox", "--output-schema", "--output-last-message", "--ignore-user-config"].filter((flag) => !help.stdout.includes(flag));
  check("codex", missing.length ? "not-configured" : "pass", missing.length ? `Missing flags: ${missing.join(", ")}` : help.stdout.match(/Codex CLI [^\n]+/)?.[0] || "Required exec flags available.");
}
try { await access(path.join(pluginRoot, ".codex-plugin/plugin.json")); check("plugin", "pass", "Plugin manifest is present."); } catch { check("plugin", "not-configured", "Plugin manifest is missing."); }
try {
  const schemaFindings = await validateBenchmarkOutputSchemas(pluginRoot);
  check("codex-output-schemas", schemaFindings.length ? "not-configured" : "pass", schemaFindings.length ? schemaFindings.join("; ") : "Benchmark response schemas satisfy the Codex structured-output subset.");
} catch (errorValue) { check("codex-output-schemas", "not-configured", String(errorValue.message || errorValue)); }
check("auth-mode", BENCHMARK_AUTH_MODES.includes(authMode) ? "pass" : "not-configured", BENCHMARK_AUTH_MODES.includes(authMode) ? authMode : "Set --auth-mode to api or chatgpt.");
if (authMode === "api") {
  if (requireExecution) check("api-key", process.env.CODEX_API_KEY ? "pass" : "not-configured", process.env.CODEX_API_KEY ? "Inline execution credential is available." : "CODEX_API_KEY must be supplied for API-mode execution.");
  else check("api-key", "not-applicable", "Execution was not requested.");
  check("chatgpt-subscription", "not-applicable", "API authentication was selected.");
} else if (authMode === "chatgpt") {
  check("api-key", "not-applicable", "ChatGPT subscription authentication never receives CODEX_API_KEY.");
  try {
    chatgptHomes = await resolveChatgptHomes({ args, pluginRoot, outputRoot });
    const baselineLogin = chatgptLoginStatus(codex, chatgptHomes.baseline, baseEnv);
    const launchpadLogin = chatgptLoginStatus(codex, chatgptHomes.launchpad, baseEnv);
    chatgptAuthReady = baselineLogin.status === "pass" && launchpadLogin.status === "pass";
    check("chatgpt-baseline", baselineLogin.status, baselineLogin.status === "pass" ? `ChatGPT subscription login confirmed in ${chatgptHomes.baseline}.` : baselineLogin.evidence);
    check("chatgpt-launchpad", launchpadLogin.status, launchpadLogin.status === "pass" ? `ChatGPT subscription login confirmed in ${chatgptHomes.launchpad}.` : launchpadLogin.evidence);
  } catch (errorValue) { check("chatgpt-subscription", "not-configured", String(errorValue.message || errorValue)); }
} else {
  check("api-key", "not-applicable", "Choose an authentication mode first.");
  check("chatgpt-subscription", "not-applicable", "Choose an authentication mode first.");
}
check("generator-model", generatorModel ? "pass" : "not-configured", generatorModel || "Set --generator-model or BENCHMARK_GENERATOR_MODEL.");
check("evaluator-model", evaluatorModel ? "pass" : "not-configured", evaluatorModel || "Set --evaluator-model or BENCHMARK_EVALUATOR_MODEL.");
check("evaluator-independence", generatorModel && evaluatorModel && generatorModel !== evaluatorModel ? "pass" : "not-configured", generatorModel === evaluatorModel && generatorModel ? "Evaluator must differ from the generator; identical models cannot support a release-quality claim." : generatorModel && evaluatorModel ? "Generator and evaluator profiles differ." : "Configure both model profiles.");
if (authMode === "chatgpt" && requireExecution && chatgptAuthReady && generatorModel && evaluatorModel) {
  try {
    const catalog = await readCodexModelCatalog({ codex, codexHome: chatgptHomes.baseline, env: baseEnv });
    check("model-catalog", "pass", `Authenticated Codex client returned ${catalog.length} model entries.`);
    check("generator-model-availability", modelIsAvailable(catalog, generatorModel) ? "pass" : "not-configured", modelIsAvailable(catalog, generatorModel) ? `${generatorModel} is available.` : `${generatorModel} is not available to this authenticated Codex client.`);
    check("evaluator-model-availability", modelIsAvailable(catalog, evaluatorModel) ? "pass" : "not-configured", modelIsAvailable(catalog, evaluatorModel) ? `${evaluatorModel} is available.` : `${evaluatorModel} is not available to this authenticated Codex client.`);
  } catch (errorValue) {
    check("model-catalog", "not-configured", String(errorValue.message || errorValue));
  }
} else if (authMode === "chatgpt") {
  check("model-catalog", requireExecution ? "not-configured" : "not-applicable", requireExecution ? "Authenticated ChatGPT homes and both model names are required before checking availability." : "Execution was not requested.");
}
for (const browser of ["chromium", "firefox", "webkit"]) {
  try { const executable = (await import("playwright"))[browser].executablePath(); await access(executable); check(`browser-${browser}`, "pass", executable); } catch (errorValue) { check(`browser-${browser}`, "not-configured", String(errorValue.message || errorValue)); }
}
let temp;
try {
  temp = await mkdtemp(path.join(os.tmpdir(), "launchpad-benchmark-doctor-"));
  await writeFile(path.join(temp, "write-test"), "ok"); check("workspace", "pass", temp);
  if (help.status === 0) {
    const marketplace = path.join(temp, "marketplace");
    const codexHome = path.join(temp, "codex-home");
    await mkdir(path.join(marketplace, ".agents/plugins"), { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await cp(pluginRoot, path.join(marketplace, "plugins/launchpad-designops"), { recursive: true, filter: (source) => !/[\\/](node_modules|test-results|playwright-report|benchmarks[\\/]runs)([\\/]|$)/.test(source) });
    const dependencyResult = spawnSync("npm", ["ci", "--omit=dev", "--ignore-scripts"], { cwd: path.join(marketplace, "plugins/launchpad-designops"), encoding: "utf8", timeout: 5 * 60_000, env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG || "C.UTF-8" } });
    if (dependencyResult.status !== 0) throw new Error(`Isolated runtime dependency install failed: ${dependencyResult.stderr || dependencyResult.stdout}`);
    await writeFile(path.join(marketplace, ".agents/plugins/marketplace.json"), `${JSON.stringify({ name: "launchpad-doctor", interface: { displayName: "LaunchPad doctor" }, plugins: [{ name: "launchpad-designops", source: { source: "local", path: "./plugins/launchpad-designops" }, policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Engineering" }] }, null, 2)}\n`);
    const setupEnv = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG || "C.UTF-8", CODEX_HOME: codexHome };
    const marketplaceResult = spawnSync(codex, ["plugin", "marketplace", "add", marketplace], { encoding: "utf8", timeout: 30_000, env: setupEnv });
    const installResult = marketplaceResult.status === 0 ? spawnSync(codex, ["plugin", "add", "launchpad-designops@launchpad-doctor"], { encoding: "utf8", timeout: 30_000, env: setupEnv }) : marketplaceResult;
    check("plugin-installation", installResult.status === 0 ? "pass" : "not-configured", installResult.status === 0 ? "Plugin installed in an isolated CODEX_HOME." : (installResult.stderr || installResult.stdout));
  }
} catch (errorValue) { check("workspace", "not-configured", String(errorValue.message || errorValue)); } finally { if (temp) await rm(temp, { recursive: true, force: true }); }
const required = checks.filter((item) => item.status === "not-configured");
const status = required.length ? "not-configured" : "configured";
const subjectiveConfidence = !generatorModel || !evaluatorModel ? "not-configured" : generatorModel === evaluatorModel ? "low" : "independent";
printReport({ title: "Benchmark doctor", findings: [], data: { status, checks, authMode, generatorModel, evaluatorModel, subjectiveConfidence }, json: Boolean(args.json) });
if (required.length) process.exitCode = 3;
