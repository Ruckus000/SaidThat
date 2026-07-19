import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { printReport } from "./lib.mjs";

const require = createRequire(import.meta.url);
const checks = [];
for (const dependency of ["ajv", "axe-core", "playwright"]) {
  try { checks.push({ id: dependency, status: "pass", evidence: require.resolve(dependency) }); }
  catch { checks.push({ id: dependency, status: "not-configured", evidence: `Run npm ci --omit=dev in the plugin directory; '${dependency}' is unavailable.` }); }
}
try {
  const playwright = await import("playwright");
  for (const browser of ["chromium", "firefox", "webkit"]) {
    try { const executable = playwright[browser].executablePath(); await access(executable); checks.push({ id: `browser-${browser}`, status: "pass", evidence: executable }); }
    catch { checks.push({ id: `browser-${browser}`, status: "not-configured", evidence: `Run npx playwright install ${browser}.` }); }
  }
} catch { /* Dependency finding above is sufficient. */ }
const status = checks.some((check) => check.status === "not-configured") ? "not-configured" : "configured";
printReport({ title: "LaunchPad runtime doctor", data: { status, checks } });
if (status !== "configured") process.exitCode = 3;
