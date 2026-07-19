import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import { parseArgs, printReport, walkFiles, rel, exitWith } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || process.cwd());
const findings = [];
const extensions = [".html", ".htm", ".css", ".scss", ".sass", ".less", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".php", ".blade", ".md", ".mdx", ".json"];
const defaultExcludes = ["node_modules", ".git", ".next", ".designops", ".codex", "dist", "build", "coverage", "tests", "fixtures", "docs", "playwright-report", "test-results"];

let scan = { includeRoots: ["."], excludeRoots: [] };
try {
  const manifest = JSON.parse(await readFile(path.resolve(args.manifest || path.join(root, ".designops", "project.json")), "utf8"));
  scan = { ...scan, ...(manifest.quality?.scan || {}) };
} catch {
  // Standalone scanning can use the conservative defaults.
}
const files = [];
const rootReal = await realpath(root);
const isWithin = (parent, candidate) => { const relative = path.relative(parent, candidate); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
const excluded = [];
for (const excludeRoot of scan.excludeRoots || []) {
  if (path.isAbsolute(excludeRoot) || path.win32.isAbsolute(excludeRoot) || excludeRoot.includes("\\")) {
    findings.push({ id: "scan-exclude-unsafe", severity: "P0", message: "A source scan exclusion is not a safe project-relative POSIX path.", evidence: excludeRoot });
    continue;
  }
  const resolved = path.resolve(root, excludeRoot);
  if (!isWithin(root, resolved)) findings.push({ id: "scan-exclude-escape", severity: "P0", message: "A source scan exclusion escapes the project.", evidence: excludeRoot });
  else excluded.push(resolved);
}
for (const includeRoot of scan.includeRoots || ["."]) {
  if (path.isAbsolute(includeRoot) || path.win32.isAbsolute(includeRoot) || includeRoot.includes("\\") || path.relative(root, path.resolve(root, includeRoot)).startsWith("..")) {
    findings.push({ id: "scan-root-escape", severity: "P0", message: "A source scan root escapes the project.", evidence: includeRoot, recommendation: "Use project-relative include roots." });
    continue;
  }
  try {
    const includeReal = await realpath(path.resolve(root, includeRoot));
    if (!isWithin(rootReal, includeReal)) throw new Error(`Scan root symlink escapes project: ${includeRoot}`);
    files.push(...(await walkFiles(includeReal, { extensions, ignore: defaultExcludes })).filter((filePath) => !excluded.some((excludePath) => isWithin(excludePath, filePath))));
  } catch (errorValue) {
    findings.push({ id: "scan-root-invalid", severity: "P0", message: "A configured source scan root is missing, unsafe, or unreadable.", evidence: String(errorValue.message || errorValue) });
  }
}

let exceptions = [];
try {
  const dnaPath = path.resolve(args.dna || path.join(root, ".designops", "07-design-dna.json"));
  const dna = JSON.parse(await readFile(dnaPath, "utf8"));
  exceptions = Array.isArray(dna.exceptions) ? dna.exceptions : [];
} catch {
  // Artifact/schema gates report a missing DNA contract; standalone linting remains useful without it.
}

function matchingException(pattern, filePath) {
  const needle = pattern.toLowerCase();
  return exceptions.find((exception) => {
    const affected = exception.affectedRefs || [];
    return exception.decision === "retain"
      && String(exception.pattern || "").toLowerCase().includes(needle)
      && affected.some((refValue) => refValue === "project-wide" || rel(root, filePath).includes(refValue) || refValue.includes(path.basename(filePath)));
  });
}

function add(id, severity, message, filePath, evidence, recommendation, pattern = "") {
  const exception = pattern ? matchingException(pattern, filePath) : null;
  const suffix = rel(root, filePath).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  findings.push({ id: `${id}-${suffix}`, severity, message, evidence: `${rel(root, filePath)}: ${evidence}`, recommendation, ...(exception ? { exception: `Justified by Design DNA exception '${exception.pattern}': ${exception.reason}` } : {}) });
}

let totalHex = 0;
let totalCards = 0;
const ctaCounts = new Map();
let hasMotion = false;
let hasReducedMotion = false;

for (const filePath of files) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch {
    continue;
  }
  const lower = source.toLowerCase();
  const isTokenFile = filePath.includes("tokens") || filePath.includes("design-system");
  const lines = source.split(/\r?\n/);

  if (/lorem ipsum|your headline here|add your headline|john doe|123 main st|replace this/i.test(source)) {
    add("placeholder-copy", "P1", "Placeholder or sample copy appears in project content.", filePath, "placeholder-like phrase", "Replace it with real or clearly labeled representative content.");
  }
  if (/^\s*<img\b(?![^>]*\balt\s*=)[^>]*>/im.test(source)) {
    add("missing-image-alt", "P1", "An image element may lack an alt attribute.", filePath, "<img> without an obvious static alt attribute", "Verify the rendered accessible name; only rendered verification may make this a hard failure.");
  }
  if (/\b(animate-|animation\s*:|transition\s*:|transition-)/i.test(source)) hasMotion = true;
  if (/prefers-reduced-motion/i.test(source)) hasReducedMotion = true;
  if (/from-purple|to-purple|purple-[0-9]|bg-gradient|glassmorphism/i.test(source)) {
    add("unexplained-aesthetic-signal", "P1", "A commonly convergent aesthetic signal was found.", filePath, "gradient/purple/glass pattern", "Keep only if the approved Design DNA and brief explain why it belongs here.", "gradient");
  }
  const radiusCount = (source.match(/rounded-(?:xl|2xl|3xl|full)/g) || []).length;
  if (radiusCount > 8) {
    add("repeated-radius", "P1", "A large number of highly rounded surfaces may flatten hierarchy.", filePath, `${radiusCount} rounded surface utilities`, "Review whether radius is carrying meaning or being applied by default.", "rounded");
  }
  const cardCount = (lower.match(/\bcard\b|rounded-(?:xl|2xl|3xl)/g) || []).length;
  totalCards += cardCount;
  const hexCount = (source.match(/#[0-9a-f]{3,8}\b/gi) || []).length;
  if (!isTokenFile) {
    totalHex += hexCount;
    if (hexCount > 5) add("raw-color-values", "P1", "Many raw color values appear outside token files.", filePath, `${hexCount} hex values`, "Move intentional visual decisions into semantic tokens and document exceptions.");
  }
  for (const cta of source.match(/\b(get started|learn more|explore|discover|contact us)\b/gi) || []) {
    const key = cta.toLowerCase();
    ctaCounts.set(key, (ctaCounts.get(key) || 0) + 1);
  }
  if (/^\s*<button[^>]*>\s*<(?:svg|img|Icon)\b[\s\S]*?<\/button>/im.test(source) && !/aria-label|title=/i.test(source)) {
    add("icon-only-control", "P1", "A likely icon-only button lacks a discoverable label.", filePath, "button containing only an icon-like element", "Provide an accessible name and verify keyboard/focus behavior.");
  }
  if (/\bmetric\b|\bstat\b/i.test(source) && /\b\d{2,}%?\b/.test(source) && !/source|as of|updated/i.test(source)) {
    add("unsupported-metric", "P1", "A metric-like number appears without an obvious source or date.", filePath, "metric/stat language without source marker", "Verify the claim and record its source in the requirements/claims registry.");
  }
  if (lines.length > 0 && /\b(fade|slide|bounce|pulse|spin)\b/i.test(source) && !/prefers-reduced-motion/i.test(source)) {
    add("motion-without-reduction", "P1", "Motion-like behavior appears without a reduced-motion path in the same file.", filePath, "animation name without reduced-motion query", "Add a reduced-motion alternative and review whether the motion serves orientation or feedback.");
  }
}

for (const [cta, count] of ctaCounts.entries()) {
  if (count > 3) findings.push({ id: `repeated-cta-${cta.replaceAll(" ", "-")}`, severity: "P1", message: `Generic CTA '${cta}' repeats ${count} times.`, evidence: "project-wide count", recommendation: "Use task-specific action language or document why the same CTA is appropriate." });
}
if (hasMotion && !hasReducedMotion) findings.push({ id: "project-motion-without-reduction", severity: "P1", message: "Motion signals were found but no reduced-motion support was detected.", evidence: "project-wide scan", recommendation: "Add prefers-reduced-motion behavior and manually verify the experience." });

printReport({ title: "AI slop signal audit", findings, data: { root, filesScanned: files.length, totalHex, totalCards, motion: hasMotion, reducedMotion: hasReducedMotion }, json: Boolean(args.json) });
exitWith(findings.filter((finding) => finding.severity === "P0"));
