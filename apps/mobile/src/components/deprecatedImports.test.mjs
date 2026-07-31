import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Imports react-native no longer wants us to use.
 *
 * A runtime assertion on the deprecation console.warn looks more direct and is
 * worthless: react-native routes these through warnOnce, so the warning fires on
 * whichever test renders first and is silent for every test after it. A guard
 * written that way passes with the deprecated component still in the tree —
 * verified, not assumed. Reading the source is order-independent and cannot go
 * quietly vacuous.
 */
const BANNED = [
  {
    name: "SafeAreaView",
    from: "react-native",
    use: "react-native-safe-area-context",
    why: "deprecated in react-native and slated for removal",
  },
];

// Directories with no source to check. Everything else under the app root is
// walked, so a new top-level file or folder is covered without editing this test.
const SKIP_DIRS = new Set(["node_modules", "assets", "screenshots"]);

async function sourceFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await sourceFiles(full)));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

test("source: no file imports a deprecated react-native export", async () => {
  // The whole app root, not App.tsx plus src/ — the earlier version missed
  // index.ts and would have missed any future top-level component.
  const files = await sourceFiles(MOBILE_ROOT);
  assert.ok(files.length > 10, "the scan found the source tree");
  const scanned = files.map((f) => path.relative(MOBILE_ROOT, f));
  assert.ok(scanned.includes("App.tsx"), "the entry component is scanned");
  assert.ok(scanned.includes("index.ts"), "the root registration file is scanned");

  const offences = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const banned of BANNED) {
      // Matches the whole import statement for the module, so a name buried in a
      // multi-line or aliased import list is still caught.
      const importFrom = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${banned.from}["']`, "gs");
      for (const match of source.matchAll(importFrom)) {
        const named = match[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim());
        if (named.includes(banned.name)) {
          offences.push(
            `${path.relative(MOBILE_ROOT, file)} imports ${banned.name} from ${banned.from} ` +
              `(${banned.why}) — use ${banned.use}`,
          );
        }
      }
    }
  }

  assert.deepEqual(offences, [], `deprecated imports:\n${offences.join("\n")}`);
});
