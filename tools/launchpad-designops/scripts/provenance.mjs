import crypto from "node:crypto";
import { lstat, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { walkFiles } from "./lib.mjs";

const SOURCE_IGNORES = ["node_modules", ".git", ".designops", ".next", "dist", "build", "coverage", "test-results", "playwright-report"];

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function digest(value) {
  return `sha256:${sha256(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value))}`;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function resolveContainedPath(root, relativePath, { mustExist = true } = {}) {
  if (typeof relativePath !== "string" || !relativePath.trim()) throw new Error("Artifact path must be a nonempty string.");
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) throw new Error(`Absolute artifact path is not allowed: ${relativePath}`);
  if (relativePath.includes("\\")) throw new Error(`Artifact paths must use project-relative POSIX separators: ${relativePath}`);
  const lexical = path.resolve(root, relativePath);
  if (!isWithin(path.resolve(root), lexical)) throw new Error(`Artifact path escapes .designops: ${relativePath}`);
  const rootReal = await realpath(root);
  if (!mustExist) {
    let parent = path.dirname(lexical);
    while (parent !== path.dirname(parent)) {
      try {
        const parentReal = await realpath(parent);
        if (!isWithin(rootReal, parentReal)) throw new Error(`Artifact parent symlink escapes .designops: ${relativePath}`);
        return lexical;
      } catch (errorValue) {
        if (String(errorValue.code || "") !== "ENOENT") throw errorValue;
        parent = path.dirname(parent);
      }
    }
    throw new Error(`Unable to resolve artifact parent safely: ${relativePath}`);
  }
  const candidateReal = await realpath(lexical);
  if (!isWithin(rootReal, candidateReal)) throw new Error(`Artifact symlink escapes .designops: ${relativePath}`);
  const stat = await lstat(lexical);
  if (!stat.isFile()) throw new Error(`Artifact is not a regular file: ${relativePath}`);
  return lexical;
}

export async function hashArtifact(root, key, relativePath) {
  const absolutePath = await resolveContainedPath(root, relativePath);
  let source = await readFile(absolutePath);
  if (key === "project") {
    const manifest = JSON.parse(source.toString("utf8"));
    if (manifest.workflow) delete manifest.workflow.gates;
    source = Buffer.from(JSON.stringify(manifest));
  }
  return { path: relativePath, sha256: sha256(source) };
}

export async function hashArtifacts(root, artifactPaths, keys) {
  const artifacts = {};
  for (const key of keys) {
    const relativePath = key === "project" ? "project.json" : artifactPaths[key];
    if (!relativePath) throw new Error(`Required artifact '${key}' has no manifest path.`);
    artifacts[key] = await hashArtifact(root, key, relativePath);
  }
  return artifacts;
}

export function digestArtifacts(artifacts) {
  const normalized = Object.entries(artifacts)
    .map(([name, artifact]) => ({ name, path: artifact.path, sha256: artifact.sha256 }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return digest(normalized);
}

function gitHead(projectRoot) {
  const result = spawnSync("git", ["-C", projectRoot, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 10_000 });
  return result.status === 0 ? result.stdout.trim() : null;
}

export async function computeImplementationDigest(projectRoot, sourceRoots) {
  const projectReal = await realpath(projectRoot);
  const records = [];
  for (const sourceRoot of sourceRoots) {
    if (path.isAbsolute(sourceRoot) || path.win32.isAbsolute(sourceRoot)) throw new Error(`Absolute source root is not allowed: ${sourceRoot}`);
    if (sourceRoot.includes("\\")) throw new Error(`Source roots must use project-relative POSIX separators: ${sourceRoot}`);
    const lexical = path.resolve(projectRoot, sourceRoot);
    if (!isWithin(path.resolve(projectRoot), lexical)) throw new Error(`Source root escapes the project: ${sourceRoot}`);
    const sourceReal = await realpath(lexical);
    if (!isWithin(projectReal, sourceReal)) throw new Error(`Source root symlink escapes the project: ${sourceRoot}`);
    const sourceStat = await lstat(sourceReal);
    const files = sourceStat.isFile() ? [sourceReal] : await walkFiles(sourceReal, { ignore: SOURCE_IGNORES });
    files.sort();
    for (const filePath of files) {
      const fileReal = await realpath(filePath);
      if (!isWithin(projectReal, fileReal)) throw new Error(`Source file symlink escapes the project: ${path.relative(projectRoot, filePath)}`);
      records.push({ path: path.relative(projectRoot, filePath), sha256: sha256(await readFile(filePath)) });
    }
  }
  return digest({ head: gitHead(projectRoot), files: records.sort((a, b) => a.path.localeCompare(b.path)) });
}

export function computeVerificationInputDigest({ designDigest, implementationDigest, verificationConfigHash, verifierDigest }) {
  if (!verifierDigest) throw new Error("Verification input digest requires a verifier/toolchain digest.");
  return digest({ designDigest, implementationDigest, verificationConfigHash, verifierDigest });
}

export function computeApprovalDigest({ phase, mode, designDigest, implementationDigest = null, verificationReportHash = null, policyVersion }) {
  if (!policyVersion) throw new Error("Approval digest requires an explicit gate policy version.");
  return digest({ phase, mode, designDigest, implementationDigest, verificationReportHash, policyVersion });
}

export async function writeJsonAtomic(filePath, payload) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, filePath);
}
