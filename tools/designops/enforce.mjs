#!/usr/bin/env node

import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const DESIGNOPS_ROOT = path.join(PROJECT_ROOT, ".designops");
export const VENDOR_ROOT = path.join(PROJECT_ROOT, "tools/launchpad-designops");

const PLANNING_PREFIXES = Object.freeze([
  ".cursor/",
  ".designops/",
  ".github/",
  ".githooks/",
  "docs/",
  "tools/"
]);

const PLANNING_FILES = Object.freeze(new Set([
  ".editorconfig",
  ".gitignore",
  "AGENTS.md",
  "LICENSE",
  "README.md"
]));

const PHASE_ORDER = Object.freeze([
  "strategy",
  "direction",
  "handoff",
  "implementation",
  "verification",
  "release",
  "complete"
]);

const NATIVE_CHECKS = Object.freeze([
  "accessibility",
  "sensors",
  "lifecycle",
  "offline",
  "performance"
]);

export class EnforcementError extends Error {
  constructor(message, exitCode = 1, details = []) {
    super(message);
    this.name = "EnforcementError";
    this.exitCode = exitCode;
    this.details = details;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeRelativePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new EnforcementError(`Unable to read JSON: ${path.relative(PROJECT_ROOT, file)}`, 3, [String(error.message || error)]);
  }
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    throw new EnforcementError(`Git command failed: git ${args.join(" ")}`, 3, [result.stderr.trim() || result.stdout.trim()]);
  }
  return result.status === 0 ? result.stdout.trim() : "";
}

export function classifyPath(file) {
  const normalized = normalizeRelativePath(file);
  if (!normalized) return "planning";
  if (PLANNING_FILES.has(normalized)) return "planning";
  if (PLANNING_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "planning";
  return "implementation";
}

export function inferIntent(paths, explicitIntent) {
  const invalid = explicitIntent && !["design", "implementation", "release"].includes(explicitIntent);
  if (invalid) throw new EnforcementError(`Unknown intent '${explicitIntent}'.`, 3);
  const implementationPaths = paths.filter((file) => classifyPath(file) === "implementation");
  if (explicitIntent === "design" && implementationPaths.length) {
    throw new EnforcementError("Design intent cannot modify application implementation paths.", 1, implementationPaths);
  }
  if (explicitIntent) return explicitIntent;
  return implementationPaths.length ? "implementation" : "design";
}

export function gatePhaseForIntent(intent, currentPhase) {
  if (!PHASE_ORDER.includes(currentPhase)) throw new EnforcementError(`Unknown workflow phase '${currentPhase}'.`, 3);
  if (intent === "implementation") return "handoff";
  if (intent === "release") return "release";
  if (currentPhase === "strategy") return "strategy";
  if (currentPhase === "direction") return "direction";
  return "handoff";
}

async function walkFiles(target) {
  const metadata = await lstat(target);
  if (metadata.isFile()) return [target];
  if (!metadata.isDirectory()) return [];
  const entries = await readdir(target, { withFileTypes: true });
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "node_modules" || entry.name === "INTEGRITY.json") continue;
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) output.push(...await walkFiles(child));
    else if (entry.isFile()) output.push(child);
  }
  return output;
}

export async function computeVendorDigest(vendorRoot = VENDOR_ROOT) {
  const manifest = await readJson(path.join(vendorRoot, "INTEGRITY.json"));
  const files = [];
  for (const relative of manifest.included || []) {
    const target = path.resolve(vendorRoot, relative);
    if (!isContained(vendorRoot, target) || !existsSync(target)) {
      throw new EnforcementError(`Integrity target is missing or unsafe: ${relative}`, 1);
    }
    files.push(...await walkFiles(target));
  }
  files.sort((a, b) => a.localeCompare(b));
  const records = [];
  for (const file of files) {
    const relative = normalizeRelativePath(path.relative(vendorRoot, file));
    records.push(`${relative}\0${sha256(await readFile(file))}\n`);
  }
  return { manifest, fileCount: files.length, sha256: sha256(records.join("")) };
}

export async function verifyVendorIntegrity(vendorRoot = VENDOR_ROOT) {
  const result = await computeVendorDigest(vendorRoot);
  const findings = [];
  if (result.fileCount !== result.manifest.fileCount) findings.push(`fileCount=${result.fileCount}; expected=${result.manifest.fileCount}`);
  if (result.sha256 !== result.manifest.sha256) findings.push(`sha256=${result.sha256}; expected=${result.manifest.sha256}`);
  if (findings.length) throw new EnforcementError("Vendored DesignOps tooling failed its integrity check.", 1, findings);
  return result;
}

export async function verifySourceIntegrity(projectRoot = PROJECT_ROOT, requirementsFile = path.join(DESIGNOPS_ROOT, "03-requirements-map.json")) {
  const registry = await readJson(requirementsFile);
  const findings = [];
  for (const source of registry.sources || []) {
    if (!source.sha256) continue;
    const target = path.resolve(projectRoot, source.locator);
    if (!isContained(projectRoot, target)) {
      findings.push(`${source.id}: locator escapes the project (${source.locator})`);
      continue;
    }
    if (!existsSync(target)) {
      findings.push(`${source.id}: source is missing (${source.locator})`);
      continue;
    }
    const actual = sha256(await readFile(target));
    if (actual !== source.sha256) findings.push(`${source.id}: sha256=${actual}; expected=${source.sha256}; locator=${source.locator}`);
  }
  if (findings.length) throw new EnforcementError("Registered planning evidence is stale or missing.", 1, findings);
  return { checked: (registry.sources || []).filter((source) => source.sha256).length };
}

export async function resolveTrustedReviewerKey(projectRoot = PROJECT_ROOT, requestedPath, { required = false } = {}) {
  const candidate = requestedPath || process.env.DESIGNOPS_TRUSTED_PUBLIC_KEY_FILE || path.join(os.homedir(), ".config/launchpad/reviewer-public.pem");
  if (!existsSync(candidate)) {
    if (required) throw new EnforcementError(`Trusted reviewer public key is required and was not found: ${candidate}`, 3);
    return null;
  }
  const resolved = await realpath(candidate);
  const root = await realpath(projectRoot);
  if (isContained(root, resolved)) throw new EnforcementError("Trusted reviewer public key must remain outside the project workspace.", 3, [resolved]);
  return resolved;
}

export async function validateImplementationException(paths, projectRoot = PROJECT_ROOT) {
  const file = path.join(projectRoot, ".designops/10-owner-implementation-exception.json");
  if (!existsSync(file)) return null;
  const exception = await readJson(file);
  if (exception.schemaVersion !== "1" || exception.status !== "active" || exception.scope !== "full-mvp-local-first") {
    throw new EnforcementError("The owner implementation exception is incomplete or inactive.", 1);
  }
  if (!Array.isArray(exception.allowedImplementationPrefixes) || exception.allowedImplementationPrefixes.length === 0) {
    throw new EnforcementError("The owner implementation exception has no allowed implementation paths.", 1);
  }
  const implementationPaths = paths.filter((filePath) => classifyPath(filePath) === "implementation");
  const outsideScope = implementationPaths.filter((filePath) => !exception.allowedImplementationPrefixes.some((prefix) => normalizeRelativePath(filePath).startsWith(prefix)));
  if (outsideScope.length) {
    throw new EnforcementError("Implementation changes exceed the owner exception scope.", 1, outsideScope);
  }
  await verifyEvidenceRecords(exception.simulationEvidence, projectRoot, "simulationEvidence");
  if (!Array.isArray(exception.constraints) || !exception.constraints.some((value) => String(value).includes("does not convert AI simulation output into participant evidence"))) {
    throw new EnforcementError("The owner implementation exception must preserve the simulation-evidence boundary.", 1);
  }
  return exception;
}

async function changedPaths(selector) {
  if (selector.staged) {
    return runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "--"])
      .split("\n").filter(Boolean).map(normalizeRelativePath);
  }
  if (selector.range) {
    return runGit(["diff", "--name-only", "--diff-filter=ACMR", selector.range, "--"])
      .split("\n").filter(Boolean).map(normalizeRelativePath);
  }
  if (selector.workingTree) {
    const groups = [
      runGit(["diff", "--name-only", "--diff-filter=ACMR", "--"]),
      runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "--"]),
      runGit(["ls-files", "--others", "--exclude-standard"])
    ];
    return [...new Set(groups.flatMap((group) => group.split("\n").filter(Boolean).map(normalizeRelativePath)))].sort();
  }
  return [];
}

function parseArgs(argv) {
  const args = { intent: null, staged: false, workingTree: false, range: null, json: false, trustedReviewerKey: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--intent") args.intent = argv[++index];
    else if (value === "--staged") args.staged = true;
    else if (value === "--working-tree") args.workingTree = true;
    else if (value === "--range") args.range = argv[++index];
    else if (value === "--json") args.json = true;
    else if (value === "--trusted-reviewer-key") args.trustedReviewerKey = argv[++index];
    else throw new EnforcementError(`Unknown argument '${value}'.`, 3);
  }
  const selectors = [args.staged, args.workingTree, Boolean(args.range)].filter(Boolean).length;
  if (selectors > 1) throw new EnforcementError("Use only one of --staged, --working-tree, or --range.", 3);
  if (args.range === undefined || args.intent === undefined || args.trustedReviewerKey === undefined) throw new EnforcementError("An option is missing its value.", 3);
  return args;
}

function reviewExists(project, phase) {
  const key = `${phase}Review`;
  const relative = project.artifacts?.[key];
  return Boolean(relative && existsSync(path.join(DESIGNOPS_ROOT, relative)));
}

function runQualityGate(phase, trustedReviewerKey) {
  const gate = path.join(VENDOR_ROOT, "scripts/quality-gate.mjs");
  const args = [gate, "--root", DESIGNOPS_ROOT, "--project-root", PROJECT_ROOT, "--phase", phase, "--json"];
  if (trustedReviewerKey) args.push("--trusted-reviewer-key", trustedReviewerKey);
  const result = spawnSync(process.execPath, args, { cwd: PROJECT_ROOT, encoding: "utf8" });
  const exitCode = Number.isInteger(result.status) ? result.status : 3;
  let report = null;
  try { report = JSON.parse(result.stdout || "null"); } catch { /* Retain raw output below. */ }
  return { exitCode, report, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export function assertGateDecision(intent, phase, gate) {
  if (gate.exitCode === 3) throw new EnforcementError("The DesignOps gate could not run.", 3, [gate.stderr || gate.stdout]);
  if (gate.exitCode === 1) throw new EnforcementError("The DesignOps gate found a blocking quality failure.", 1, [gate.stderr || gate.stdout]);
  if (intent !== "design" && gate.exitCode === 2) throw new EnforcementError(`The ${phase} gate requires explicit signed human review.`, 2, [gate.stderr || gate.stdout]);
  if (![0, 2].includes(gate.exitCode)) throw new EnforcementError(`Unexpected DesignOps gate exit '${gate.exitCode}'.`, 3);
  return { reviewRequired: gate.exitCode === 2 };
}

async function verifyEvidenceRecords(records, projectRoot, label) {
  if (!Array.isArray(records) || records.length === 0) throw new EnforcementError(`${label} must contain at least one evidence record.`, 1);
  for (const [index, record] of records.entries()) {
    if (!record || typeof record.path !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256 || "")) {
      throw new EnforcementError(`${label}[${index}] must provide path and sha256.`, 1);
    }
    const target = path.resolve(projectRoot, record.path);
    if (!isContained(projectRoot, target) || !existsSync(target)) throw new EnforcementError(`${label}[${index}] evidence is missing or unsafe: ${record.path}`, 1);
    const actual = sha256(await readFile(target));
    if (actual !== record.sha256) throw new EnforcementError(`${label}[${index}] evidence hash is stale: ${record.path}`, 1, [`sha256=${actual}`, `expected=${record.sha256}`]);
  }
}

export async function validateNativeVerification(project, projectRoot = PROJECT_ROOT) {
  const file = path.join(projectRoot, ".designops/native-verification.json");
  if (!existsSync(file)) throw new EnforcementError("Native iOS and Android verification evidence is required for release.", 1, [path.relative(projectRoot, file)]);
  const verification = await readJson(file);
  if (verification.schemaVersion !== "1" || verification.status !== "pass") throw new EnforcementError("Native verification must have schemaVersion=1 and status=pass.", 1);
  const handoffReviewRelative = project.artifacts?.handoffReview;
  const handoffReviewFile = handoffReviewRelative ? path.resolve(projectRoot, ".designops", handoffReviewRelative) : null;
  if (!handoffReviewFile || !isContained(path.join(projectRoot, ".designops"), handoffReviewFile) || !existsSync(handoffReviewFile)) {
    throw new EnforcementError("A current signed handoff review is required before native release evidence can be accepted.", 1);
  }
  const handoffReview = await readJson(handoffReviewFile);
  const expectedHandoff = handoffReview.approvalDigest;
  if (project.workflow?.gates?.handoff?.approvalDigest !== expectedHandoff) throw new EnforcementError("Project handoff gate state does not match the signed handoff review.", 1);
  if (!expectedHandoff || verification.handoffApprovalDigest !== expectedHandoff) throw new EnforcementError("Native verification is not bound to the current handoff approval digest.", 1);
  const currentCommit = runGit(["rev-parse", "HEAD"]);
  if (verification.commit !== currentCommit) throw new EnforcementError("Native verification is not bound to the current commit.", 1, [`commit=${verification.commit || "missing"}`, `expected=${currentCommit}`]);
  for (const platform of ["ios", "android"]) {
    const record = verification.platforms?.[platform];
    if (record?.status !== "pass") throw new EnforcementError(`Native verification platform '${platform}' is not passing.`, 1);
    await verifyEvidenceRecords(record.evidence, projectRoot, `platforms.${platform}.evidence`);
  }
  for (const check of NATIVE_CHECKS) {
    const record = verification.checks?.[check];
    if (record?.status !== "pass") throw new EnforcementError(`Native verification check '${check}' is not passing.`, 1);
    await verifyEvidenceRecords(record.evidence, projectRoot, `checks.${check}.evidence`);
  }
  return verification;
}

function formatResult(result, json) {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  const lines = [
    `DesignOps enforcement: ${result.decision.toUpperCase()}`,
    `intent=${result.intent} phase=${result.phase} gateExit=${result.gateExit}`,
    `paths=${result.paths.length} sources=${result.sourcesChecked} vendorFiles=${result.vendorFiles}`
  ];
  if (result.message) lines.push(result.message);
  if (result.details?.length) lines.push(...result.details.map((detail) => `- ${detail}`));
  return `${lines.join("\n")}\n`;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); }
  catch (error) {
    const failure = error instanceof EnforcementError ? error : new EnforcementError(String(error.message || error), 3);
    process.stderr.write(formatResult({ decision: "blocked", intent: null, phase: null, gateExit: failure.exitCode, paths: [], sourcesChecked: 0, vendorFiles: 0, message: failure.message, details: failure.details }, argv.includes("--json")));
    return failure.exitCode;
  }

  try {
    const paths = await changedPaths(args);
    const intent = inferIntent(paths, args.intent);
    const vendor = await verifyVendorIntegrity();
    const sources = await verifySourceIntegrity();
    const project = await readJson(path.join(DESIGNOPS_ROOT, "project.json"));
    const currentPhase = project.workflow?.currentPhase;
    const phase = gatePhaseForIntent(intent, currentPhase);
    const exception = ["design", "implementation"].includes(intent) ? await validateImplementationException(paths) : null;
    if (intent === "implementation" && exception) {
      const result = {
        decision: "allowed",
        intent,
        phase: "owner-exception",
        currentPhase,
        gateExit: 0,
        reviewRequired: false,
        paths,
        sourcesChecked: sources.checked,
        vendorFiles: vendor.fileCount,
        message: "The scoped owner exception permits local-first MVP implementation; it does not establish human evidence or release readiness.",
        details: exception.constraints
      };
      process.stdout.write(formatResult(result, args.json));
      return 0;
    }
    const keyRequired = intent !== "design" || reviewExists(project, phase);
    const trustedReviewerKey = await resolveTrustedReviewerKey(PROJECT_ROOT, args.trustedReviewerKey, { required: keyRequired });
    const gate = runQualityGate(phase, trustedReviewerKey);
    const gateDecision = assertGateDecision(intent, phase, gate);
    if (intent === "release") await validateNativeVerification(project);

    const result = {
      decision: "allowed",
      intent,
      phase,
      currentPhase,
      gateExit: gate.exitCode,
      reviewRequired: gateDecision.reviewRequired,
      paths,
      sourcesChecked: sources.checked,
      vendorFiles: vendor.fileCount,
      message: gate.exitCode === 2
        ? exception
          ? "Planning work may continue; the active owner exception also permits the scoped local-first MVP under apps/mobile/."
          : "Planning work may continue, but application implementation remains blocked pending signed approval."
        : "The requested intent is permitted by the current DesignOps policy.",
      details: []
    };
    process.stdout.write(formatResult(result, args.json));
    return 0;
  } catch (error) {
    const failure = error instanceof EnforcementError ? error : new EnforcementError(String(error.message || error), 3);
    const result = { decision: "blocked", intent: args.intent, phase: null, gateExit: failure.exitCode, paths: [], sourcesChecked: 0, vendorFiles: 0, message: failure.message, details: failure.details };
    process.stderr.write(formatResult(result, args.json));
    return failure.exitCode;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main();
}
