import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, printReport, exitWith } from "./lib.mjs";
import { BENCHMARK_DIGEST_POLICY, benchmarkWorkspaceDigest } from "./benchmark-digest.mjs";
import { digest, writeJsonAtomic } from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || "benchmarks/runs");
const reviewer = String(args.reviewer || "").trim();
const findings = [];
const packets = [];

if (!reviewer) {
  console.error("Usage: prepare-benchmark-review-packets.mjs --root <runs> --reviewer <reviewer-label>");
  process.exitCode = 3;
} else await prepare();

async function prepare() {
  let caseEntries;
  try { caseEntries = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "pressure"); }
  catch (errorValue) {
    findings.push({ id: "review-root", severity: "P0", message: "Benchmark output root is unavailable.", evidence: String(errorValue.message || errorValue) });
    return finish();
  }
  for (const caseEntry of caseEntries) {
    const caseRoot = path.join(root, caseEntry.name);
    const runEntries = (await readdir(caseRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^run-[1-3]$/.test(entry.name));
    for (const runEntry of runEntries) await prepareRun(caseEntry.name, runEntry.name, path.join(caseRoot, runEntry.name));
  }
  finish();
}

async function prepareRun(caseId, runId, runRoot) {
  try {
    const metadata = JSON.parse(await readFile(path.join(runRoot, "metadata.json"), "utf8"));
    const baselineEvaluation = JSON.parse(await readFile(path.join(runRoot, "evaluation-baseline.json"), "utf8"));
    const launchpadEvaluation = JSON.parse(await readFile(path.join(runRoot, "evaluation-launchpad.json"), "utf8"));
    if (metadata.caseId !== caseId || metadata.runId !== runId) throw new Error("Run metadata identity mismatch.");
    if (!["api", "chatgpt"].includes(metadata.authMode)) throw new Error("Run metadata has no supported authentication mode.");
    if (metadata.artifactDigestPolicy !== BENCHMARK_DIGEST_POLICY) throw new Error("Run uses an unsupported artifact digest policy.");
    for (const [name, evaluation] of [["baseline", baselineEvaluation], ["launchpad", launchpadEvaluation]]) {
      const validation = await validateWithSchema(evaluation, "benchmark-evaluation.schema.json");
      if (!validation.valid) throw new Error(`The ${name} evaluator report is schema-invalid: ${formatSchemaErrors(validation.errors)}`);
      if (evaluation.caseId !== caseId || evaluation.runId !== runId) throw new Error(`The ${name} evaluator report identity does not match its run.`);
    }
    const current = {
      baseline: await benchmarkWorkspaceDigest(path.join(runRoot, "baseline")),
      launchpad: await benchmarkWorkspaceDigest(path.join(runRoot, "launchpad")),
      evaluationBaseline: digest(baselineEvaluation),
      evaluationLaunchpad: digest(launchpadEvaluation)
    };
    if (current.baseline !== metadata.artifacts?.baseline || current.launchpad !== metadata.artifacts?.launchpad || current.evaluationBaseline !== metadata.evaluations?.baseline || current.evaluationLaunchpad !== metadata.evaluations?.launchpad) throw new Error("Run artifacts or evaluator evidence changed after capture; review packet was not generated.");
    const finalPath = path.join(runRoot, "human-comparison.json");
    if (await exists(finalPath)) {
      const final = JSON.parse(await readFile(finalPath, "utf8"));
      const validation = await validateWithSchema(final, "benchmark-comparison.schema.json");
      if (!validation.valid) throw new Error(`Existing final comparison is schema-invalid: ${formatSchemaErrors(validation.errors)}`);
      if (final.caseId !== caseId || final.runId !== runId || !matchingDigests(final.artifactDigests, current)) throw new Error("Existing final comparison is stale or belongs to another run.");
      packets.push({ caseId, runId, status: "final-exists", path: path.relative(root, finalPath) });
      return;
    }
    const draftPath = path.join(runRoot, "human-comparison.draft.json");
    const draft = {
      caseId, runId, source: "explicit-user-attestation", reviewer, decision: "inconclusive",
      dimensions: { taskClarity: "not-applicable", trust: "not-applicable", subjectSpecificity: "not-applicable", originality: "not-applicable", visualCraft: "not-applicable", implementationFeasibility: "not-applicable" },
      evidenceRefs: ["baseline/generate-result.json", "launchpad/generate-result.json", "evaluation-baseline.json", "evaluation-launchpad.json"],
      rationale: "Review pending. Replace this text with a concrete comparison grounded in the referenced baseline and LaunchPad evidence.",
      artifactDigests: current, createdAt: new Date().toISOString()
    };
    if (await exists(draftPath)) {
      const existing = JSON.parse(await readFile(draftPath, "utf8"));
      if (!matchingDigests(existing.artifactDigests, current)) throw new Error("Existing human comparison draft is stale; preserve it for audit and create a new output root rather than overwriting it.");
    } else await writeJsonAtomic(draftPath, draft);
    const reviews = await existingReviewPhases(path.join(runRoot, "launchpad/.designops/reviews"));
    const packetPath = path.join(runRoot, "review-packet.json");
    await writeJsonAtomic(packetPath, {
      schemaVersion: "0.2", caseId, runId, reviewer, artifactDigestPolicy: BENCHMARK_DIGEST_POLICY, artifactDigests: current,
      execution: { authMode: metadata.authMode, generator: metadata.generatorModel, evaluator: metadata.evaluatorModel, subjectiveConfidence: metadata.subjectiveConfidence },
      deterministicGate: metadata.deterministicGate, phaseReviewsPresent: reviews,
      evaluations: { baseline: baselineEvaluation, launchpad: launchpadEvaluation },
      requiredActions: [
        "Inspect both rendered and source artifacts without using model scores as the final authority.",
        "Complete and externally sign direction, handoff, and release reviews for the LaunchPad workspace.",
        "Replace every not-applicable comparison dimension and the pending rationale in human-comparison.draft.json.",
        "Sign the completed draft to human-comparison.json with sign-benchmark-comparison.mjs."
      ]
    });
    packets.push({ caseId, runId, status: "draft-ready", draft: path.relative(root, draftPath), packet: path.relative(root, packetPath) });
  } catch (errorValue) {
    findings.push({ id: `${caseId}-${runId}-review-packet`, severity: "P0", message: "Unable to prepare a trustworthy benchmark review packet.", evidence: String(errorValue.message || errorValue) });
  }
}

async function existingReviewPhases(directory) {
  try { return (await readdir(directory)).filter((name) => /^(direction|handoff|release)\.json$/.test(name)).map((name) => name.replace(/\.json$/, "")).sort(); }
  catch (errorValue) { if (errorValue?.code === "ENOENT") return []; throw errorValue; }
}

async function exists(value) { try { await access(value); return true; } catch (errorValue) { if (errorValue?.code === "ENOENT") return false; throw errorValue; } }
function matchingDigests(actual, expected) { return Object.entries(expected).every(([key, value]) => actual?.[key] === value); }
function finish() { printReport({ title: "Benchmark human-review packet preparation", findings, data: { root, packets }, json: Boolean(args.json) }); exitWith(findings); }
