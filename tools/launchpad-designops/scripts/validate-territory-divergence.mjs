import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { buildEvidenceIndex, directionValidationAssumptions } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.input || ".designops/04-creative-territories/territories.json");
const requirementsPath = args.requirements ? path.resolve(args.requirements) : null;
const findings = [];
const axes = ["typography", "composition", "density", "geometry", "color", "imagery", "signature"];
const structural = ["hierarchy", "navigationModel", "interactionModel"];
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const similarity = (left, right) => {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (!a.size && !b.size) return 1;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / new Set([...a, ...b]).size;
};
let payload;

try {
  payload = await readJson(input);
  const result = await validateWithSchema(payload, "design-direction.schema.json");
  if (!result.valid) findings.push({ id: "territory-schema", severity: "P0", message: "Creative territories do not satisfy their schema.", evidence: formatSchemaErrors(result.errors), recommendation: "Provide exactly three complete structured territories." });
} catch (errorValue) {
  findings.push({ id: "territories-unreadable", severity: "P0", message: "Unable to read territories.json.", evidence: String(errorValue.message || errorValue) });
}

const territories = payload?.territories;
if (Array.isArray(territories) && territories.length === 3) {
  const ids = territories.map((territory) => territory.id);
  if (new Set(ids).size !== ids.length) findings.push({ id: "territory-duplicate-id", severity: "P0", message: "Territory IDs must be unique.", evidence: ids.join(", ") });
  for (let left = 0; left < territories.length; left += 1) {
    for (let right = left + 1; right < territories.length; right += 1) {
      const a = territories[left];
      const b = territories[right];
      const differentAxes = axes.filter((axis) => similarity(a.axes?.[axis], b.axes?.[axis]) < 0.72);
      const differentStructure = structural.filter((key) => similarity(a.structure?.[key], b.structure?.[key]) < 0.72).length
        + (similarity((a.structure?.contentOrder || []).join(" "), (b.structure?.contentOrder || []).join(" ")) < 0.72 ? 1 : 0)
        + (similarity(a.contentStructure, b.contentStructure) < 0.72 ? 1 : 0);
      const thesisSimilarity = similarity(`${a.thesis} ${a.contentStructure}`, `${b.thesis} ${b.contentStructure}`);
      if (differentAxes.length < 5 || differentStructure < 3 || thesisSimilarity > 0.82) {
        findings.push({ id: `territory-similarity-${a.id}-${b.id}`, severity: "P1", message: "Two creative territories may be superficial variants.", evidence: `${differentAxes.length}/7 distinct axes; ${differentStructure}/5 structural decisions; thesis similarity ${thesisSimilarity.toFixed(2)}.`, recommendation: "Change hierarchy, navigation, content order, interaction model, density, or signature—not only wording, fonts, or color." });
      }
    }
  }
  if (requirementsPath) {
    const requirements = await readJson(requirementsPath);
    const evidence = buildEvidenceIndex(requirements);
    const criteria = new Set((requirements.directionCriteria || []).map((criterion) => `criterion:${criterion.id}`));
    for (const territory of territories) {
      for (const ref of territory.evidenceRefs || []) if (!evidence.has(ref)) findings.push({ id: `territory-evidence-${territory.id}-${ref}`, severity: "P0", message: "Territory references unknown evidence.", evidence: ref });
      const evaluated = new Set((territory.criterionEvaluations || []).map((entry) => entry.criterionRef));
      for (const ref of criteria) if (!evaluated.has(ref)) findings.push({ id: `territory-criterion-${territory.id}-${ref}`, severity: "P0", message: "Territory omits a predeclared direction criterion.", evidence: ref });
    }
    for (const assumption of directionValidationAssumptions(requirements)) {
      const ref = `assumption:${assumption.id}`;
      const relationships = territories.map((territory) => (territory.assumptionDependencies || []).find((entry) => entry.ref === ref)?.relationship);
      if (relationships.some((relationship) => !relationship)) findings.push({ id: `territory-assumption-missing-${assumption.id}`, severity: "P0", message: "Every territory must declare its relationship to a high-risk core assumption.", evidence: ref });
      if (!relationships.includes("challenges")) findings.push({ id: `territory-assumption-unchallenged-${assumption.id}`, severity: "P0", message: "At least one territory must challenge every high-risk core assumption.", evidence: ref });
    }
  }
}

printReport({ title: "Creative territory divergence", findings, data: { input, axes }, json: Boolean(args.json) });
exitWith(findings.filter((finding) => finding.severity === "P0"));
