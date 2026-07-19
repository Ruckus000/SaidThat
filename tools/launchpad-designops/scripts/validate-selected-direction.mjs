import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { digest } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { buildEvidenceIndex } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.input || ".designops/05-selected-direction.json");
const territoriesPath = path.resolve(args.territories || ".designops/04-creative-territories/territories.json");
const requirementsPath = args.requirements ? path.resolve(args.requirements) : null;
const findings = [];
let selected;
let territories;

try {
  [selected, territories] = await Promise.all([readJson(input), readJson(territoriesPath)]);
  const result = await validateWithSchema(selected, "selected-direction.schema.json");
  if (!result.valid) findings.push({ id: "selected-direction-schema", severity: "P0", message: "Selected direction does not satisfy its schema.", evidence: formatSchemaErrors(result.errors) });
} catch (errorValue) {
  findings.push({ id: "selected-direction-unreadable", severity: "P0", message: "Unable to read selected direction or territory collection.", evidence: String(errorValue.message || errorValue) });
}

if (selected && territories) {
  const ids = new Set((territories.territories || []).map((territory) => territory.id));
  if (!ids.has(selected.selectedId)) findings.push({ id: "selected-direction-id", severity: "P0", message: "Selected direction ID does not exist in the territory collection.", evidence: selected.selectedId });
  const currentDigest = digest(await readFile(territoriesPath));
  if (selected.territoryDigest !== currentDigest) findings.push({ id: "selected-direction-stale", severity: "P0", message: "Selected direction references a stale territory collection.", evidence: `selected=${selected.territoryDigest} current=${currentDigest}` });
  const rejected = new Set((selected.rejectedAlternatives || []).map((entry) => entry.id));
  if (rejected.size !== (selected.rejectedAlternatives || []).length) findings.push({ id: "selected-direction-duplicate-rejection", severity: "P0", message: "Rejected alternative IDs must be unique." });
  if (rejected.has(selected.selectedId)) findings.push({ id: "selected-direction-rejects-selected", severity: "P0", message: "The selected territory cannot also be rejected.", evidence: selected.selectedId });
  for (const id of rejected) if (!ids.has(id)) findings.push({ id: `selected-direction-unknown-rejection-${id}`, severity: "P0", message: "Rejected alternative does not exist in the territory collection.", evidence: id });
  for (const id of ids) if (id !== selected.selectedId && !rejected.has(id)) findings.push({ id: `selected-direction-rejection-${id}`, severity: "P0", message: "Every non-selected territory needs an explicit rejection rationale.", evidence: id });
  if (requirementsPath) {
    const requirements = await readJson(requirementsPath);
    const evidence = buildEvidenceIndex(requirements);
    const refs = [...(selected.decisionBasis?.verifiedRefs || []), ...(selected.decisionBasis?.assumptionRefs || []), ...(selected.decisionBasis?.criterionRefs || [])];
    for (const risk of selected.acceptedRisks || []) refs.push(...(risk.validationRefs || []));
    for (const alternative of selected.rejectedAlternatives || []) refs.push(...(alternative.criterionRefs || []));
    for (const ref of refs) if (!evidence.has(ref)) findings.push({ id: `selected-direction-evidence-${ref}`, severity: "P0", message: "Selected direction references unknown evidence.", evidence: ref });
  }
}

printReport({ title: "Selected direction validation", findings, data: { input, territoriesPath }, json: Boolean(args.json) });
exitWith(findings);
