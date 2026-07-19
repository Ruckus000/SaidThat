import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function printReport({ title, findings = [], data = null, json = false }) {
  const report = { title, findings, ...(data ? { data } : {}) };
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(title);
  if (findings.length === 0) {
    console.log("PASS");
  } else {
    for (const finding of findings) {
      console.log(`${finding.severity ?? "INFO"} ${finding.id ?? "finding"}: ${finding.message}`);
      if (finding.evidence) console.log(`  Evidence: ${finding.evidence}`);
      if (finding.recommendation) console.log(`  Recommendation: ${finding.recommendation}`);
    }
  }
  if (data) console.log(JSON.stringify(data, null, 2));
}

export async function walkFiles(root, { extensions = null, ignore = [] } = {}) {
  const files = [];
  async function visit(directory) {
    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignore.includes(entry.name)) continue;
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(filePath);
      } else if (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())) {
        files.push(filePath);
      }
    }
  }
  await visit(root);
  return files;
}

export function rel(root, filePath) {
  return path.relative(root, filePath) || ".";
}

export function exitWith(findings, { code = 1 } = {}) {
  if (findings.length > 0) process.exitCode = code;
}
