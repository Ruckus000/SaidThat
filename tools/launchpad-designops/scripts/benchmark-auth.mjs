import { readFile, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const BENCHMARK_AUTH_MODES = ["api", "chatgpt"];

export function requestedAuthMode(args, environment = process.env) {
  return String(args["auth-mode"] || environment.BENCHMARK_AUTH_MODE || "").trim().toLowerCase();
}

export async function resolveChatgptHomes({ args, environment = process.env, pluginRoot, outputRoot }) {
  const baselineInput = args["baseline-codex-home"] || environment.BENCHMARK_BASELINE_CODEX_HOME;
  const launchpadInput = args["launchpad-codex-home"] || environment.BENCHMARK_LAUNCHPAD_CODEX_HOME;
  if (!baselineInput || !launchpadInput) throw new Error("ChatGPT auth requires --baseline-codex-home and --launchpad-codex-home (or their BENCHMARK_* environment variables).");
  const baseline = await dedicatedHome(baselineInput, { role: "baseline", environment, pluginRoot, outputRoot });
  const launchpad = await dedicatedHome(launchpadInput, { role: "launchpad", environment, pluginRoot, outputRoot });
  if (baseline === launchpad) throw new Error("Baseline and LaunchPad must use different dedicated CODEX_HOME directories.");
  return { baseline, launchpad };
}

export function chatgptLoginStatus(codex, codexHome, baseEnv) {
  const result = spawnSync(codex, ["login", "status"], { encoding: "utf8", timeout: 15_000, env: { ...baseEnv, CODEX_HOME: codexHome } });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return { status: result.status === 0 && /logged in using chatgpt/i.test(output) ? "pass" : "not-configured", evidence: output || `codex login status exited ${result.status}` };
}

async function dedicatedHome(input, { role, environment, pluginRoot, outputRoot }) {
  const resolved = await realpath(path.resolve(String(input)));
  if (!(await stat(resolved)).isDirectory()) throw new Error(`${role} CODEX_HOME is not a directory: ${resolved}`);
  const personalHome = await maybeRealpath(path.resolve(environment.CODEX_HOME || path.join(os.homedir(), ".codex")));
  if (personalHome && resolved === personalHome) throw new Error(`${role} CODEX_HOME must be dedicated to benchmarks; the personal Codex home is not allowed.`);
  for (const [label, boundary] of [["plugin repository", pluginRoot], ["benchmark output", outputRoot]]) {
    const boundaryResolved = await maybeRealpath(path.resolve(boundary));
    if (boundaryResolved && (inside(boundaryResolved, resolved) || inside(resolved, boundaryResolved))) throw new Error(`${role} CODEX_HOME must remain separate from the ${label}.`);
  }
  const config = await optionalRead(path.join(resolved, "config.toml"));
  const pluginSections = [...config.matchAll(/^\s*\[plugins\.([^\]]+)\]\s*$/gm)].map((match) => match[1]);
  if (role === "baseline" && pluginSections.length) throw new Error(`Baseline CODEX_HOME is contaminated and must remain plugin-free: ${pluginSections.join(", ")}`);
  if (role === "launchpad" && pluginSections.some((section) => !section.includes("launchpad-designops@launchpad-local"))) throw new Error(`LaunchPad CODEX_HOME contains unrelated enabled plugins: ${pluginSections.join(", ")}`);
  validateBenchmarkConfig(config, role);
  return resolved;
}

function validateBenchmarkConfig(config, role) {
  let section = "";
  for (const [index, sourceLine] of config.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      section = line;
      const allowedLaunchpadSection = /^\[marketplaces\.launchpad-local\]$/.test(section) || /^\[plugins\."launchpad-designops@launchpad-local"\]$/.test(section);
      if (role === "baseline" || !allowedLaunchpadSection) throw new Error(`${role === "baseline" ? "Baseline" : "LaunchPad"} CODEX_HOME contains unrelated configuration at line ${index + 1}: ${line}`);
      continue;
    }
    if (!section) {
      const key = line.split("=", 1)[0].trim();
      if (!["cli_auth_credentials_store", "forced_login_method", "forced_chatgpt_workspace_id"].includes(key)) throw new Error(`${role === "baseline" ? "Baseline" : "LaunchPad"} CODEX_HOME contains unrelated top-level configuration at line ${index + 1}: ${key}`);
    }
  }
}

async function optionalRead(filePath) {
  try { return await readFile(filePath, "utf8"); } catch (errorValue) { if (errorValue?.code === "ENOENT") return ""; throw errorValue; }
}

async function maybeRealpath(value) {
  try { return await realpath(value); } catch (errorValue) { if (errorValue?.code === "ENOENT") return null; throw errorValue; }
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
