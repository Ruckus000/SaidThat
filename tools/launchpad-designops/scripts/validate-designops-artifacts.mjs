import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { getGateProfile } from "./gate-policy.mjs";
import { resolveContainedPath } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { requiresDirectionValidation } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || ".designops");
const phase = args.phase;
const findings = [];
let project;

if (!phase) findings.push({ id: "phase-required", severity: "P0", message: "--phase is required." });
try {
  project = await readJson(path.join(root, "project.json"));
  const result = await validateWithSchema(project, "project-manifest.schema.json");
  if (!result.valid) findings.push({ id: "project-schema", severity: "P0", message: "Project manifest is invalid.", evidence: formatSchemaErrors(result.errors) });
} catch (errorValue) {
  findings.push({ id: "manifest-unreadable", severity: "P0", message: "Unable to read project.json.", evidence: String(errorValue.message || errorValue) });
}

if (project && phase) {
  try {
    const requirements = await readJson(await resolveContainedPath(root, project.artifacts.requirementsMap));
    const required = requiresDirectionValidation(requirements);
    const profile = getGateProfile({ mode: project.project.mode, phase, verificationMode: project.quality.verificationMode, strategyReviewRequired: required, directionValidationRequired: required });
    for (const key of profile.artifactKeys) {
      const relativePath = key === "project" ? "project.json" : project.artifacts[key];
      if (!relativePath) findings.push({ id: `artifact-${key}-path`, severity: "P0", message: `Required artifact '${key}' is not referenced.` });
      else try { await resolveContainedPath(root, relativePath); } catch (errorValue) { findings.push({ id: `artifact-${key}-invalid`, severity: "P0", message: `Required artifact '${key}' is missing, unsafe, or not a file.`, evidence: String(errorValue.message || errorValue) }); }
    }
  } catch (errorValue) {
    findings.push({ id: "profile-invalid", severity: "P0", message: "Gate profile cannot be resolved.", evidence: String(errorValue.message || errorValue) });
  }
}

printReport({ title: "LaunchPad 0.2 artifact validation", findings, data: { root, phase }, json: Boolean(args.json) });
exitWith(findings);
