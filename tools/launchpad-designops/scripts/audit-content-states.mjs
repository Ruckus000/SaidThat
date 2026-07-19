import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { buildEvidenceIndex } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.input || ".designops/06-content-state-map.json");
const requirementsPath = args.requirements ? path.resolve(args.requirements) : null;
const requiredStates = ["normal", "loading", "empty", "error", "success", "permission-unavailable"];
const findings = [];
let payload;

try {
  payload = await readJson(input);
  const result = await validateWithSchema(payload, "content-state-map.schema.json");
  if (!result.valid) findings.push({ id: "content-state-schema", severity: "P0", message: "Content-state map does not satisfy its schema.", evidence: formatSchemaErrors(result.errors) });
} catch (errorValue) {
  findings.push({ id: "state-map-unreadable", severity: "P0", message: "Unable to read the content-state map.", evidence: String(errorValue.message || errorValue) });
}

if (payload) {
  const names = (payload.states || []).map((state) => state.name);
  if (new Set(names).size !== names.length) findings.push({ id: "duplicate-content-state", severity: "P0", message: "Content-state names must be unique.", evidence: names.join(", ") });
  for (const name of requiredStates) if (!names.includes(name)) findings.push({ id: `missing-${name}`, severity: "P0", message: `Required content-state decision '${name}' is missing.` });
  const normal = (payload.states || []).find((state) => state.name === "normal");
  if (normal?.applicability !== "applicable") findings.push({ id: "normal-not-applicable", severity: "P0", message: "The normal state must be applicable." });

  let evidence = null;
  if (requirementsPath) evidence = buildEvidenceIndex(await readJson(requirementsPath));
  for (const state of payload.states || []) {
    if (state.applicability === "applicable" && /lorem ipsum|placeholder|\btodo\b|\btbd\b/i.test(state.content || "")) findings.push({ id: `placeholder-${state.name}`, severity: "P1", message: `State '${state.name}' uses placeholder content.`, evidence: state.content, recommendation: "Use realistic representative content." });
    if (evidence) for (const ref of state.evidenceRefs || []) if (!evidence.has(ref)) findings.push({ id: `state-evidence-${state.name}-${ref}`, severity: "P0", message: `State '${state.name}' references unknown evidence.`, evidence: ref });
  }
  if (evidence) for (const [condition, value] of Object.entries(payload.verificationConditions || {})) for (const ref of value.evidenceRefs || []) if (!evidence.has(ref)) findings.push({ id: `condition-evidence-${condition}-${ref}`, severity: "P0", message: `Verification condition '${condition}' references unknown evidence.`, evidence: ref });
}

printReport({ title: "Content-state coverage", findings, data: { input, requiredStates }, json: Boolean(args.json) });
exitWith(findings.filter((finding) => finding.severity === "P0"));
