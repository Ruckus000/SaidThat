import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const currentPath = path.resolve(args.current || ".designops/project-fingerprint.json");
const previousPath = path.resolve(args.previous || "previous-project-fingerprint.json");
const threshold = Number(args.threshold || 0.75);
const fields = ["typography", "palette", "composition", "density", "geometry", "imagery", "signature", "motion"];
const findings = [];
let current;
let previous;

try { current = await readJson(currentPath); } catch (errorValue) { findings.push({ id: "current-fingerprint-missing", severity: "P1", message: "Current project fingerprint could not be read.", evidence: String(errorValue.message || errorValue) }); }
try { previous = await readJson(previousPath); } catch { previous = null; }

if (current && previous) {
  const matches = fields.filter((field) => current[field] !== undefined && current[field] === previous[field]);
  const similarity = matches.length / fields.length;
  if (similarity >= threshold) {
    findings.push({ id: "fingerprint-convergence", severity: "P1", message: "The project is highly similar to the comparison fingerprint.", evidence: `${matches.length}/${fields.length} fields match (${similarity.toFixed(2)}).`, recommendation: "Revisit the specificity thesis and change the underlying composition or signature, not only surface styling." });
  }
  printReport({ title: "Project fingerprint comparison", findings, data: { currentPath, previousPath, similarity, matchingFields: matches } });
} else {
  printReport({ title: "Project fingerprint comparison", findings, data: { currentPath, previousPath, comparisonAvailable: false } });
}
exitWith(findings.filter((finding) => finding.severity === "P0"));
