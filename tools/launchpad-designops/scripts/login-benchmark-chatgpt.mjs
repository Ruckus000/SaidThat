import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, printReport } from "./lib.mjs";
import { chatgptLoginStatus, resolveChatgptHomes } from "./benchmark-auth.mjs";

const args = parseArgs(process.argv.slice(2));
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const codex = process.env.CODEX_BIN || "codex";
const baselineInput = path.resolve(args["baseline-codex-home"] || process.env.BENCHMARK_BASELINE_CODEX_HOME || path.join(os.homedir(), ".codex-launchpad-benchmark/baseline"));
const launchpadInput = path.resolve(args["launchpad-codex-home"] || process.env.BENCHMARK_LAUNCHPAD_CODEX_HOME || path.join(os.homedir(), ".codex-launchpad-benchmark/launchpad"));
const outputRoot = path.resolve(args.root || path.join(pluginRoot, "benchmarks/runs"));
const baseEnv = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG || "C.UTF-8" }).filter(([, value]) => value));
const results = [];

try {
  if (baselineInput === launchpadInput) throw new Error("Baseline and LaunchPad CODEX_HOME directories must differ.");
  await mkdir(baselineInput, { recursive: true, mode: 0o700 });
  await mkdir(launchpadInput, { recursive: true, mode: 0o700 });
  const homes = await resolveChatgptHomes({ args: { ...args, "baseline-codex-home": baselineInput, "launchpad-codex-home": launchpadInput }, pluginRoot, outputRoot });
  for (const [role, home] of Object.entries(homes)) {
    let status = chatgptLoginStatus(codex, home, baseEnv);
    if (status.status !== "pass") {
      console.error(`Starting ChatGPT device authorization for the dedicated ${role} benchmark home: ${home}`);
      const login = spawnSync(codex, ["login", "--device-auth"], { env: { ...baseEnv, CODEX_HOME: home }, stdio: "inherit" });
      if (login.status !== 0) throw new Error(`${role} ChatGPT device authorization exited ${login.status}.`);
      status = chatgptLoginStatus(codex, home, baseEnv);
    }
    if (status.status !== "pass") throw new Error(`${role} home did not confirm ChatGPT subscription authentication: ${status.evidence}`);
    results.push({ role, home, status: "authenticated-with-chatgpt" });
  }
  printReport({ title: "LaunchPad benchmark ChatGPT login", data: { authMode: "chatgpt", homes: results }, json: Boolean(args.json) });
} catch (errorValue) {
  console.error(`ChatGPT benchmark login failed: ${String(errorValue.message || errorValue)}`);
  process.exitCode = 3;
}
