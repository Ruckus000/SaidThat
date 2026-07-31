import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

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

/**
 * Tracked source under apps/mobile, from git rather than from a directory walk.
 *
 * A walk needs a skip list, and that list has to be kept in step with .gitignore
 * by hand — it already drifted once: dist/, web-build/, ios/ and android/ are all
 * ignored build output and all would have been read, so an `expo export` into the
 * default location could fail this test by naming a generated file nobody wrote.
 * Asking git means the scan covers exactly the committed source by construction,
 * and cannot depend on what happens to be lying around locally.
 */
async function sourceFiles() {
  const { stdout } = await run("git", ["ls-files", "-z", "--", "."], { cwd: MOBILE_ROOT });
  return stdout
    .split("\0")
    .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f));
}

test("source: no file imports a deprecated react-native export", async () => {
  const scanned = await sourceFiles();
  assert.ok(scanned.length > 10, "the scan found the source tree");
  assert.ok(scanned.includes("App.tsx"), "the entry component is scanned");
  assert.ok(scanned.includes("index.ts"), "the root registration file is scanned");

  const offences = [];
  for (const file of scanned) {
    const source = await readFile(path.join(MOBILE_ROOT, file), "utf8");
    for (const banned of BANNED) {
      // Matches the whole import statement for the module, so a name buried in a
      // multi-line or aliased import list is still caught.
      const importFrom = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${banned.from}["']`, "gs");
      for (const match of source.matchAll(importFrom)) {
        const named = match[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim());
        if (named.includes(banned.name)) {
          offences.push(
            `${file} imports ${banned.name} from ${banned.from} ` +
              `(${banned.why}) — use ${banned.use}`,
          );
        }
      }
    }
  }

  assert.deepEqual(offences, [], `deprecated imports:\n${offences.join("\n")}`);
});
