import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { directionValidationAssumptions } from "./evidence-refs.mjs";
import { digest, resolveContainedPath } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { verifyReviewSignature } from "./review-signature.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || ".designops");
const requirementsPath = path.resolve(args.requirements || path.join(root, "03-requirements-map.json"));
const territoriesPath = path.resolve(args.territories || path.join(root, "04-creative-territories/territories.json"));
const selectedPath = path.resolve(args.selected || path.join(root, "05-selected-direction.json"));
const planPath = path.resolve(args.plan || path.join(root, "05-direction-validation/plan.json"));
const resultsPath = path.resolve(args.results || path.join(root, "05-direction-validation/results.json"));
const findings = [];
const add = (id, message, evidence, recommendation) => findings.push({ id, severity: "P0", message, evidence, recommendation });

try {
  const [requirements, territories, selected, plan, results] = await Promise.all([
    readJson(requirementsPath), readJson(territoriesPath), readJson(selectedPath), readJson(planPath), readJson(resultsPath)
  ]);
  const requiredAssumptions = directionValidationAssumptions(requirements);
  if (!requiredAssumptions.length) {
    printReport({ title: "Direction validation", findings: [], data: { status: "not-applicable" }, json: Boolean(args.json) });
    process.exitCode = 0;
  } else {
    const soloFormative = plan.researchMode === "solo-formative";
    const independentStudy = plan.researchMode === "independent-study";
    let planSignatureVerified = false;
    const [planSchema, resultsSchema] = await Promise.all([
      validateWithSchema(plan, "direction-validation-plan.schema.json"),
      validateWithSchema(results, "direction-validation-results.schema.json")
    ]);
    if (!planSchema.valid) add("direction-validation-plan-schema", "Validation plan does not satisfy its schema.", formatSchemaErrors(planSchema.errors), "Complete the selected validation protocol before testing.");
    if (!resultsSchema.valid) add("direction-validation-results-schema", "Validation results do not satisfy their schema.", formatSchemaErrors(resultsSchema.errors), "Record only the protocol evidence that actually exists.");
    if (results.researchMode !== plan.researchMode) add("direction-validation-mode-mismatch", "Validation results use a different research mode than the plan.", `${results.researchMode} != ${plan.researchMode}`, "Regenerate results from the current plan mode.");

    const trustedKeyPath = args["trusted-reviewer-key"];
    if (independentStudy && !trustedKeyPath) add("direction-validation-key-missing", "An independent-study plan requires a trusted external reviewer key.", "--trusted-reviewer-key was not supplied.", "Supply the external public key used to sign the plan.");
    else if (independentStudy) {
      const keyReal = await realpath(path.resolve(trustedKeyPath));
      const rootReal = await realpath(path.dirname(root));
      const relative = path.relative(rootReal, keyReal);
      if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) add("direction-validation-key-unsafe", "Trusted reviewer key must be outside the project workspace.", keyReal, "Move the public key outside the project and rerun.");
      else try { verifyReviewSignature(plan, await readFile(keyReal, "utf8")); planSignatureVerified = true; } catch (errorValue) { add("direction-validation-signature", "Validation plan signature is invalid.", String(errorValue.message || errorValue), "Have the reviewer sign the unchanged plan with the trusted key."); }
    }

    const currentTerritoryDigest = digest(await readFile(territoriesPath));
    const currentPlanDigest = digest(await readFile(planPath));
    for (const [label, value] of [["plan", plan], ["results", results]]) {
      if (value.selectedId !== selected.selectedId) add(`direction-validation-${label}-selection`, `${label} is bound to a different selected direction.`, `${value.selectedId} != ${selected.selectedId}`, "Regenerate evidence for the current selection.");
      if (value.territoryDigest !== currentTerritoryDigest) add(`direction-validation-${label}-territories`, `${label} references a stale territory collection.`, value.territoryDigest, "Regenerate evidence from the current territories.");
    }
    if (resultsSchema.valid && results.planDigest !== currentPlanDigest) add("direction-validation-plan-stale", "Results do not reference the current signed validation plan.", `${results.planDigest} != ${currentPlanDigest}`, "Discard stale results or restore the signed plan.");

    const requiredRefs = new Set(requiredAssumptions.map((item) => `assumption:${item.id}`));
    const plannedRefs = new Set(plan.assumptionRefs || []);
    for (const ref of requiredRefs) if (!plannedRefs.has(ref)) add(`direction-validation-assumption-${ref}`, "A triggering assumption is absent from the validation plan.", ref, "Test every high-risk core assumption before direction approval.");

    const candidateList = plan.candidates || [];
    const candidateIdList = candidateList.map((candidate) => candidate.id);
    if (new Set(candidateIdList).size !== candidateIdList.length) add("direction-validation-candidate-ids", "Candidate IDs must be unique.", candidateIdList.join(", "), "Use distinct IDs for the selected direction and countermodel.");
    const roles = new Map(candidateList.map((candidate) => [candidate.role, candidate]));
    if (independentStudy && (roles.size !== 2 || !roles.has("selected") || !roles.has("countermodel"))) add("direction-validation-candidates", "Independent study requires one selected candidate and one countermodel.", JSON.stringify([...roles.keys()]), "Provide a fair two-model comparison.");
    if (soloFormative && (roles.size !== 1 || !roles.has("selected"))) add("direction-validation-solo-candidate", "Solo formative discovery may inspect only the selected candidate.", JSON.stringify([...roles.keys()]), "Use one selected candidate; comparative evidence requires independent-study mode.");
    if (roles.get("selected")?.id !== selected.selectedId) add("direction-validation-selected-candidate", "Selected candidate does not match selected direction.", roles.get("selected")?.id, "Bind the selected prototype to the current direction.");
    const contentDigests = new Set((plan.candidates || []).map((candidate) => candidate.contentDigest));
    if (contentDigests.size !== 1) add("direction-validation-content-parity", "Candidates do not use identical content evidence.", [...contentDigests].join(", "), "Use one shared content fixture and digest for both candidates.");
    if (contentDigests.size === 1 && !contentDigests.has(plan.sharedContentDigest)) add("direction-validation-content-binding", "Candidate content digests do not match the shared content fixture.", [...contentDigests].join(", "), "Bind both candidates to the frozen shared content digest.");
    try {
      const sharedContent = await resolveContainedPath(root, plan.sharedContentPath);
      const actual = digest(await readFile(sharedContent));
      if (actual !== plan.sharedContentDigest) add("direction-validation-shared-content", "Shared content digest is stale.", `${plan.sharedContentDigest} != ${actual}`, "Re-sign the plan after intentionally changing shared content.");
    } catch (errorValue) { add("direction-validation-shared-content", "Shared content fixture is missing or unsafe.", String(errorValue.message || errorValue), "Store the frozen content fixture inside .designops."); }
    for (const candidate of plan.candidates || []) {
      try {
        const prototype = await resolveContainedPath(root, candidate.prototypePath);
        const actual = digest(await readFile(prototype));
        if (actual !== candidate.prototypeDigest) add(`direction-validation-prototype-${candidate.id}`, "Prototype digest is stale.", `${candidate.prototypeDigest} != ${actual}`, "Re-sign the plan after intentionally changing a prototype.");
      } catch (errorValue) { add(`direction-validation-prototype-${candidate.id}`, "Prototype is missing or unsafe.", String(errorValue.message || errorValue), "Store the frozen low-fidelity prototype inside .designops."); }
    }

    const criteriaByType = new Map((plan.killCriteria || []).map((criterion) => [criterion.type, criterion]));
    const criteriaById = new Map((plan.killCriteria || []).map((criterion) => [criterion.id, criterion]));
    if (independentStudy && criteriaByType.get("eligibility-misunderstanding")?.threshold !== 1) add("direction-validation-eligibility-threshold", "Eligibility misunderstanding must use a threshold of one.", String(criteriaByType.get("eligibility-misunderstanding")?.threshold), "Restore the safety-first threshold.");
    if (independentStudy && criteriaByType.get("unrecovered-path-failure")?.threshold !== 2) add("direction-validation-path-threshold", "Unrecovered path failure must use a threshold of two.", String(criteriaByType.get("unrecovered-path-failure")?.threshold), "Restore the precommitted failure-pattern threshold.");
    if (soloFormative && (criteriaByType.get("no-fit-discovery")?.threshold !== 1 || criteriaById.size !== 1)) add("direction-validation-solo-criterion", "Solo formative discovery requires one no-fit discovery signal with threshold one.", JSON.stringify(plan.killCriteria || []), "Keep the author walkthrough focused on its single highest-risk no-fit hypothesis.");

    const candidateIds = new Set(candidateIdList);
    const completed = (results.sessions || []).filter((session) => session.completed);
    const sessionIds = (results.sessions || []).map((session) => session.id);
    if (new Set(sessionIds).size !== sessionIds.length) add("direction-validation-session-ids", "Session IDs must be unique.", sessionIds.join(", "), "Use anonymous unique session labels.");
    const firstCounts = new Map();
    const triggerCounts = new Map([...criteriaById.keys()].map((id) => [id, 0]));
    for (const session of completed) {
      const order = session.candidateOrder || [];
      const expectedCandidateCount = independentStudy ? 2 : 1;
      if (new Set(order).size !== expectedCandidateCount || order.some((id) => !candidateIds.has(id))) add(`direction-validation-order-${session.id}`, "Candidate order is invalid.", order.join(", "), independentStudy ? "Test both frozen candidates once per completed session." : "Inspect the selected candidate once in the solo walkthrough.");
      firstCounts.set(order[0], (firstCounts.get(order[0]) || 0) + 1);
      const observationIdList = (session.observations || []).map((observation) => observation.candidateId);
      const observationIds = new Set(observationIdList);
      if (observationIds.size !== observationIdList.length) add(`direction-validation-observation-duplicate-${session.id}`, "Completed session contains duplicate candidate observations.", observationIdList.join(", "), "Record exactly one observation per candidate.");
      for (const id of candidateIds) if (!observationIds.has(id)) add(`direction-validation-observation-${session.id}-${id}`, "Completed session lacks candidate evidence.", id, independentStudy ? "Record both candidate observations." : "Record the selected-candidate walkthrough observation.");
      const selectedObservation = (session.observations || []).find((observation) => observation.candidateId === selected.selectedId);
      const outcomeList = session.criterionOutcomes || [];
      const outcomeIds = outcomeList.map((outcome) => outcome.criterionId);
      if (new Set(outcomeIds).size !== outcomeIds.length) add(`direction-validation-criterion-duplicate-${session.id}`, "Completed session contains duplicate kill-criterion outcomes.", outcomeIds.join(", "), "Record exactly one outcome per precommitted criterion.");
      for (const criterionId of criteriaById.keys()) if (!outcomeIds.includes(criterionId)) add(`direction-validation-criterion-missing-${session.id}-${criterionId}`, "Completed session omits a precommitted kill criterion.", criterionId, "Record every criterion outcome for every completed session.");
      for (const outcome of outcomeList) {
        const criterion = criteriaById.get(outcome.criterionId);
        if (!criterion) { add(`direction-validation-criterion-unknown-${session.id}-${outcome.criterionId}`, "Session references an unknown kill criterion.", outcome.criterionId, "Use only criteria from the signed plan."); continue; }
        const deterministic = criterion.type === "eligibility-misunderstanding" ? selectedObservation?.eligibilityComprehension === "misunderstood"
          : criterion.type === "unrecovered-path-failure" || criterion.type === "no-fit-discovery" ? selectedObservation?.pathOutcome === "failure" && selectedObservation?.recovered === false : null;
        if (deterministic !== null && outcome.triggered !== deterministic) add(`direction-validation-criterion-mismatch-${session.id}-${criterion.id}`, "Recorded criterion outcome contradicts structured session evidence.", `${outcome.triggered} != ${deterministic}`, "Correct the observation rather than overriding the precommitted rule.");
        if (outcome.triggered) triggerCounts.set(criterion.id, (triggerCounts.get(criterion.id) || 0) + 1);
      }
    }
    const firstValues = [...firstCounts.values()];
    if (independentStudy && completed.length > 0 && (firstValues.length !== 2 || Math.abs(firstValues[0] - firstValues[1]) > 1)) add("direction-validation-counterbalance", "Completed sessions are not counterbalanced.", JSON.stringify(Object.fromEntries(firstCounts)), "Keep first-position counts within one participant.");

    const independentEvidenceComplete = independentStudy && planSchema.valid && resultsSchema.valid && planSignatureVerified
      && completed.length >= plan.protocol.sessionTarget
      && completed.every((session) => session.subject === "participant");
    const approvalEvidenceMode = independentEvidenceComplete ? "independent-study" : "hypothesis-only";
    if (independentStudy && !independentEvidenceComplete) add("direction-validation-independent-evidence-incomplete", "An independent-study label cannot grant approval eligibility without verified independent-study evidence.", "A valid signed plan, trusted reviewer key, and the required completed participant sessions are all required.", "Do not relabel solo or incomplete evidence. Complete the independent-study contract or keep the work hypothesis-only.");

    const triggered = [];
    for (const criterion of criteriaById.values()) if ((triggerCounts.get(criterion.id) || 0) >= criterion.threshold) triggered.push(criterion.id);
    const expectedStatus = soloFormative ? "hypothesis-only" : completed.length < plan.protocol.sessionTarget ? "inconclusive" : triggered.length ? "invalidated" : "pass";
    if (Date.parse(results.createdAt) < Date.parse(plan.createdAt)) add("direction-validation-chronology", "Results timestamp precedes the signed plan timestamp.", `${results.createdAt} < ${plan.createdAt}`, "Record results only after the plan is signed. Local timestamps are a consistency check, not trusted proof of chronology.");
    if (results.summary.completedSessions !== completed.length) add("direction-validation-session-count", "Summary session count is inaccurate.", `${results.summary.completedSessions} != ${completed.length}`, "Derive the summary from completed sessions.");
    if (results.summary.status !== expectedStatus) add("direction-validation-status", "Summary status does not match deterministic results.", `${results.summary.status} != ${expectedStatus}`, "Use the computed safety-first outcome.");
    if (JSON.stringify([...(results.summary.triggeredCriteria || [])].sort()) !== JSON.stringify(triggered.sort())) add("direction-validation-triggered", "Summary kill criteria do not match session evidence.", JSON.stringify(results.summary.triggeredCriteria), "Record the exact triggered criteria.");
    if (expectedStatus === "inconclusive") add("direction-validation-inconclusive", "Direction validation is incomplete or inconclusive.", `${completed.length}/${plan.protocol.sessionTarget} completed sessions.`, "Complete the signed protocol before direction approval.");
    if (expectedStatus === "invalidated") add("direction-validation-invalidated", "The selected direction triggered a precommitted kill criterion.", triggered.join(", "), "Reject the direction and return to territory exploration.");
    if (soloFormative && triggered.length) add("direction-validation-solo-discovery-signal", "The solo author walkthrough exposed an unresolved direction risk.", triggered.join(", "), "Treat this as a hypothesis for redesign, not as evidence of participant behavior or a direction verdict.");
    if (soloFormative) add("direction-validation-solo-hypothesis-only", "Solo formative evidence cannot approve a design direction.", `${completed.length}/${plan.protocol.sessionTarget} solo author walkthroughs; no independent participant evidence exists.`, "Keep this run hypothesis-only. Use an independent-study protocol with real participants before direction approval.");

    printReport({ title: "Direction validation", findings, data: { status: expectedStatus, declaredResearchMode: plan.researchMode, approvalEvidenceMode, completedSessions: completed.length, triggerCounts: Object.fromEntries(triggerCounts), planDigest: currentPlanDigest }, json: Boolean(args.json) });
    exitWith(findings);
  }
} catch (errorValue) {
  add("direction-validation-unreadable", "Direction validation evidence is missing, unsafe, or unreadable.", String(errorValue.message || errorValue), "Create the selected validation plan, then record only the evidence that actually exists.");
  printReport({ title: "Direction validation", findings, data: { status: "blocked" }, json: Boolean(args.json) });
  exitWith(findings);
}
