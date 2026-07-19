import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { buildEvidenceIndex, CORE_DECISIONS } from "./evidence-refs.mjs";

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.input || ".designops/03-requirements-map.json");
const mode = args.mode || "proposal-demo";
const findings = [];
let payload;

const add = (id, message, evidence, recommendation) => findings.push({ id, severity: "P0", message, evidence, recommendation });

try {
  payload = await readJson(input);
  const result = await validateWithSchema(payload, "requirements-map.schema.json");
  if (!result.valid) add("requirements-schema", "The evidence registry does not satisfy its schema.", formatSchemaErrors(result.errors), "Repair the registry contract before proceeding.");
} catch (errorValue) {
  add("requirements-unreadable", "Unable to read the evidence registry.", String(errorValue.message || errorValue), "Create a valid requirements map before proceeding.");
}

if (payload) {
  const collections = ["sources", "users", "tasks", "claims", "assumptions", "unknowns", "deliverables", "directionCriteria"];
  for (const collection of collections) {
    const ids = (payload[collection] || []).map((item) => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) add(`duplicate-${collection}`, `The ${collection} registry contains duplicate IDs.`, [...new Set(duplicates)].join(", "), "Assign stable unique IDs.");
  }

  const evidenceIndex = buildEvidenceIndex(payload);
  const resolveRefs = (record, refs, label, allowedCollections = null) => {
    for (const ref of refs || []) {
      const resolved = evidenceIndex.get(ref);
      if (!resolved) add(`unresolved-${label}-${record.id}-${ref}`, `${label} '${record.id}' references unknown evidence.`, ref, "Use an exact typed reference to a registered record.");
      else if (allowedCollections && !allowedCollections.includes(resolved.collection)) add(`invalid-${label}-reference-${record.id}-${ref}`, `${label} '${record.id}' uses an invalid evidence type.`, ref, `Use one of: ${allowedCollections.join(", ")}.`);
    }
  };
  for (const user of payload.users || []) resolveRefs(user, user.evidenceRefs, "user", ["sources"]);
  for (const task of payload.tasks || []) resolveRefs(task, task.evidenceRefs, "task", ["sources", "users"]);
  for (const claim of payload.claims || []) resolveRefs(claim, claim.sourceRefs, "claim", ["sources"]);
  for (const assumption of payload.assumptions || []) {
    resolveRefs(assumption, assumption.sourceRefs, "assumption", ["sources", "tasks", "claims", "unknowns"]);
    const core = (assumption.affectedDecisions || []).some((decision) => CORE_DECISIONS.has(decision));
    if (["high", "critical"].includes(assumption.risk) && core && assumption.validation?.requiredAt !== "direction") add(`assumption-validation-stage-${assumption.id}`, `High-risk core assumption '${assumption.id}' must be validated at direction.`, assumption.validation?.requiredAt || "missing", "Set requiredAt=direction and define falsifiable kill criteria.");
  }
  for (const criterion of payload.directionCriteria || []) resolveRefs(criterion, criterion.evidenceRefs, "criterion", ["sources", "tasks", "claims", "assumptions", "unknowns"]);

  if (mode !== "audit") {
    if (!(payload.users || []).some((user) => user.priority === "primary")) add("primary-user-missing", "At least one primary user is required.", "No users have priority=primary.", "Identify the primary user or use audit mode with a documented exception.");
    if (!(payload.tasks || []).some((task) => task.priority === "primary")) add("primary-task-missing", "At least one primary task is required.", "No tasks have priority=primary.", "Identify the primary task before design work.");
    if (!(payload.directionCriteria || []).length) add("direction-criteria-missing", "At least one predeclared direction criterion is required.", "directionCriteria is empty.", "Define the decision criteria before generating territories.");
  } else if (((payload.users || []).length === 0 || (payload.tasks || []).length === 0) && !payload.auditOnlyException) {
    add("audit-exception-missing", "Audit mode without users or tasks requires a documented exception.", "auditOnlyException is absent.", "Explain the bounded audit scope.");
  }

  for (const unknown of payload.unknowns || []) {
    if (unknown.risk === "critical" && !unknown.blocking && !unknown.rationale) add(`critical-unknown-${unknown.id}`, "A critical unknown cannot be nonblocking without rationale.", unknown.description, "Mark it blocking or explain why work may safely continue.");
    if (unknown.blocking) add(`blocking-unknown-${unknown.id}`, "A blocking unknown remains unresolved.", unknown.description, "Resolve the unknown or explicitly revise its risk and rationale.");
  }

  const claims = new Map((payload.claims || []).map((claim) => [claim.id, claim]));
  const expectedDeliverables = mode === "proposal" ? ["proposalSpec"] : mode === "demo" ? ["demoSpec"] : mode === "proposal-demo" ? ["proposalSpec", "demoSpec"] : [];
  for (const artifact of expectedDeliverables) if (!(payload.deliverables || []).some((deliverable) => deliverable.artifact === artifact)) add(`deliverable-${artifact}-missing`, `Project mode '${mode}' requires a '${artifact}' registry entry.`, artifact, "Register the deliverable and its approved claim usage.");
  for (const deliverable of payload.deliverables || []) {
    for (const claimRef of deliverable.claimRefs || []) {
      const claim = claims.get(claimRef);
      if (!claim) add(`unknown-deliverable-claim-${deliverable.id}-${claimRef}`, `Deliverable '${deliverable.id}' references an unknown claim.`, claimRef, "Register or remove the claim reference.");
      else if (claim.status === "unsupported") add(`unsupported-deliverable-claim-${deliverable.id}-${claimRef}`, `Deliverable '${deliverable.id}' uses an unsupported claim.`, claim.text, "Remove the claim from the deliverable or supply verified support.");
      else if (!claim.sourceRefs.length) add(`unsubstantiated-deliverable-claim-${deliverable.id}-${claimRef}`, `Deliverable '${deliverable.id}' uses a claim without supporting sources.`, claim.text, "Attach a registered source before approving the claim for use.");
      else if (!claim.approvedUsage.includes(deliverable.artifact)) add(`unapproved-claim-usage-${deliverable.id}-${claimRef}`, `Claim '${claimRef}' is not approved for ${deliverable.artifact}.`, claim.approvedUsage.join(", ") || "none", "Approve the usage from evidence or remove it.");
    }
  }
}

printReport({ title: "Evidence, requirements, and claims validation", findings, data: { input, mode }, json: Boolean(args.json) });
exitWith(findings);
