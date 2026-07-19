import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { getGateProfile } from "./gate-policy.mjs";
import { resolveContainedPath } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || ".designops");
const findings = [];
const schemaByKey = {
  project: "project-manifest.schema.json", requirementsMap: "requirements-map.schema.json", territories: "design-direction.schema.json",
  selectedDirection: "selected-direction.schema.json", designDNA: "design-dna.schema.json", tokens: "tokens.schema.json",
  contentStateMap: "content-state-map.schema.json", projectFingerprint: "project-fingerprint.schema.json",
  verificationConfig: "verification-config.schema.json", verificationReport: "verification-report.schema.json",
  directionValidationPlan: "direction-validation-plan.schema.json", directionValidationResults: "direction-validation-results.schema.json",
  strategyReview: "human-review.schema.json", directionReview: "human-review.schema.json", handoffReview: "human-review.schema.json", releaseReview: "human-review.schema.json"
};
let project;

try {
  project = await readJson(path.join(root, "project.json"));
} catch (errorValue) {
  findings.push({ id: "project-unreadable", severity: "P0", message: "Unable to read project.json.", evidence: String(errorValue.message || errorValue) });
}

let keys = [];
if (project) {
  const projectResult = await validateWithSchema(project, schemaByKey.project);
  if (!projectResult.valid) findings.push({ id: "project-schema", severity: "P0", message: "Project manifest does not satisfy the 0.2 schema.", evidence: formatSchemaErrors(projectResult.errors) });
  try {
    if (args.kind && args.kind !== "all" && args.kind !== "artifacts") keys = [args.kind];
    else if (args.phase) {
      const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
      const { requiresDirectionValidation } = await import("./evidence-refs.mjs");
      const required = requiresDirectionValidation(requirements);
      keys = getGateProfile({ mode: project.project.mode, phase: args.phase, verificationMode: project.quality.verificationMode, strategyReviewRequired: required, directionValidationRequired: required }).artifactKeys.filter((key) => key !== "project");
    }
    else keys = Object.keys(project.artifacts || {});
  } catch (errorValue) {
    findings.push({ id: "schema-profile", severity: "P0", message: "Cannot derive schema profile.", evidence: String(errorValue.message || errorValue) });
  }
}

for (const key of [...new Set(keys)]) {
  const schemaFile = schemaByKey[key];
  if (!schemaFile) continue; // Markdown specifications are provenance-checked, not JSON-schema validated.
  try {
    const artifactPath = await resolveContainedPath(root, project.artifacts[key]);
    const payload = await readJson(artifactPath);
    const result = await validateWithSchema(payload, schemaFile);
    if (!result.valid) findings.push({ id: `${key}-schema`, severity: "P0", message: `Artifact '${key}' does not satisfy ${schemaFile}.`, evidence: formatSchemaErrors(result.errors) });
  } catch (errorValue) {
    findings.push({ id: `${key}-unreadable`, severity: "P0", message: `Unable to validate artifact '${key}'.`, evidence: String(errorValue.message || errorValue) });
  }
}

printReport({ title: "LaunchPad 0.2 schema validation", findings, data: { root, keys }, json: Boolean(args.json) });
exitWith(findings);
