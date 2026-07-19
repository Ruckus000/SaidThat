import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { digest } from "./provenance.mjs";

export const BENCHMARK_DIGEST_POLICY = "benchmark-artifacts-v3";

export async function benchmarkWorkspaceDigest(workspace) {
  const files = (await readdir(workspace, { recursive: true }))
    .filter((name) => !name.split(path.sep).includes("node_modules"))
    .filter((name) => !name.startsWith(path.join(".designops", "reviews") + path.sep))
    .filter((name) => name !== path.join(".designops", "09-review-report.json"))
    .sort();
  const records = [];
  for (const name of files) {
    const filePath = path.join(workspace, name);
    const stat = await lstat(filePath);
    if (stat.isSymbolicLink()) throw new Error(`Benchmark workspaces may not contain symbolic links: ${name}`);
    if (!stat.isFile()) continue;
    let content = await readFile(filePath);
    if (name === path.join(".designops", "project.json")) {
      const project = JSON.parse(content.toString("utf8"));
      if (project.workflow) delete project.workflow.gates;
      content = Buffer.from(JSON.stringify(project));
    }
    records.push({ path: name.split(path.sep).join("/"), digest: digest(content) });
  }
  return digest(records);
}
