import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printReport, exitWith } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];
try {
  const manifest = JSON.parse(await readFile(path.join(root, ".codex-plugin/plugin.json"), "utf8"));
  if (manifest.name !== "launchpad-designops") findings.push({ id: "manifest-name", severity: "P0", message: "Plugin name is invalid." });
  if (manifest.version !== "0.2.0") findings.push({ id: "manifest-version", severity: "P0", message: "Plugin version must be 0.2.0." });
  if (manifest.skills !== "./skills/") findings.push({ id: "manifest-skills", severity: "P0", message: "Skills path is invalid." });
} catch (errorValue) { findings.push({ id: "manifest", severity: "P0", message: "Plugin manifest is unreadable.", evidence: String(errorValue.message || errorValue) }); }
const skillDirs = (await readdir(path.join(root, "skills"), { withFileTypes: true })).filter((item) => item.isDirectory());
if (skillDirs.length !== 8) findings.push({ id: "skill-count", severity: "P0", message: "Version 0.2 must expose exactly eight public skills.", evidence: String(skillDirs.length) });
for (const directory of skillDirs) {
  try {
    const source = await readFile(path.join(root, "skills", directory.name, "SKILL.md"), "utf8");
    if (!/^---\nname: [a-z0-9-]+\ndescription: .+\n---\n/.test(source)) findings.push({ id: `skill-${directory.name}`, severity: "P0", message: "Skill frontmatter is invalid." });
  } catch (errorValue) { findings.push({ id: `skill-${directory.name}`, severity: "P0", message: "Skill is unreadable.", evidence: String(errorValue.message || errorValue) }); }
}
printReport({ title: "Plugin manifest and skill validation", findings, data: { skillCount: skillDirs.length } });
exitWith(findings);
