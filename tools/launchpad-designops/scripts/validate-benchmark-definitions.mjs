import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, printReport, exitWith } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const findings = [];
const cases = [];
for (const name of await readdir(path.join(root, "benchmarks/cases"))) if (name.endsWith(".json")) {
  try {
    const value = JSON.parse(await readFile(path.join(root, "benchmarks/cases", name), "utf8"));
    cases.push(value);
    for (const key of ["id", "brief", "prompt", "requiredChecks"]) if (!value[key] || (Array.isArray(value[key]) && !value[key].length)) findings.push({ id: `case-${name}-${key}`, severity: "P0", message: `Benchmark case '${name}' is missing '${key}'.` });
    try { await readFile(path.join(root, value.brief), "utf8"); } catch { findings.push({ id: `case-${name}-brief`, severity: "P0", message: `Benchmark brief '${value.brief}' is not reachable.` }); }
  } catch (errorValue) { findings.push({ id: `case-${name}`, severity: "P0", message: "Benchmark case is invalid JSON.", evidence: String(errorValue.message || errorValue) }); }
}
const ids = cases.map((item) => item.id);
if (new Set(ids).size !== ids.length) findings.push({ id: "case-duplicate", severity: "P0", message: "Benchmark case IDs must be unique." });
let pressure = [];
try { pressure = JSON.parse(await readFile(path.join(root, "tests/pressure-scenarios/cases.json"), "utf8")); } catch (errorValue) { findings.push({ id: "pressure-unreadable", severity: "P0", message: "Pressure definitions are unreadable.", evidence: String(errorValue.message || errorValue) }); }
for (const scenario of pressure) {
  if (!scenario.id || !scenario.prompt) findings.push({ id: `pressure-${scenario.id || "unknown"}`, severity: "P0", message: "Pressure case requires only an ID and neutral adversarial prompt." });
  if ("expected" in scenario || "reason" in scenario || /expected|must block|block the request/i.test(scenario.prompt || "")) findings.push({ id: `pressure-leading-${scenario.id}`, severity: "P0", message: "Pressure prompt leaks its expected outcome." });
}
printReport({ title: "Benchmark definition validation", findings, data: { cases: ids, pressureCases: pressure.length }, json: Boolean(args.json) });
exitWith(findings);
