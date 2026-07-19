import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, printReport } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || process.cwd());
const ignored = new Set(["node_modules", ".git", ".next", "vendor", "dist", "build"]);
const records = [];

async function discover(directory, depth = 0) {
  if (depth > 4) return;
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) await discover(filePath, depth + 1);
    else if (/^(package|composer)\.json$|^(next|vite|tailwind)\.config\.(js|mjs|cjs|ts)$|^artisan$|^wp-config\.php$/.test(entry.name)) records.push(filePath);
  }
}
await discover(root);

const packageDeps = new Set();
const composerDeps = new Set();
for (const filePath of records) {
  try {
    const data = JSON.parse(await readFile(filePath, "utf8"));
    if (path.basename(filePath) === "package.json") for (const section of ["dependencies", "devDependencies", "peerDependencies"]) for (const name of Object.keys(data[section] || {})) packageDeps.add(name);
    if (path.basename(filePath) === "composer.json") for (const section of ["require", "require-dev"]) for (const name of Object.keys(data[section] || {})) composerDeps.add(name);
  } catch { /* Invalid manifests are reported by later project audits. */ }
}
const names = new Set(records.map((filePath) => path.basename(filePath)));
const hasDirectory = async (name) => { try { return (await readdir(path.join(root, name))).length >= 0; } catch { return false; } };
const signals = {
  nextjs: packageDeps.has("next") || [...names].some((name) => /^next\.config\./.test(name)),
  vite: packageDeps.has("vite") || [...names].some((name) => /^vite\.config\./.test(name)),
  wordpress: names.has("wp-config.php") || await hasDirectory("wp-content"),
  laravel: composerDeps.has("laravel/framework") || names.has("artisan") || await hasDirectory("resources/views"),
  tailwind: packageDeps.has("tailwindcss") || packageDeps.has("@tailwindcss/vite") || [...names].some((name) => /^tailwind\.config\./.test(name)),
  packageJson: records.some((value) => path.basename(value) === "package.json"),
  composerJson: records.some((value) => path.basename(value) === "composer.json"),
  nestedManifests: records.some((value) => path.dirname(value) !== root)
};
const family = signals.nextjs ? "nextjs" : signals.vite ? "vite" : signals.wordpress ? "wordpress" : signals.laravel ? "laravel" : "unknown";
const styling = signals.tailwind ? "tailwind" : signals.wordpress || signals.laravel ? "framework-template-styles" : "unknown";
printReport({ title: "LaunchPad DesignOps project detection", data: { root, family, styling, signals, inspected: records.map((value) => path.relative(root, value)) }, json: Boolean(args.json) });
