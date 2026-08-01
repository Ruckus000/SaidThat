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
 * Text must keep honouring the system text size.
 *
 * There are zero occurrences of these props today, so every `Text` inherits the
 * React Native default and scales with the user's setting. That is correct by
 * absence — and therefore completely unprotected, which is why this exists.
 *
 * The regression it guards against is a specific and tempting one. When a
 * large-text check fails on a device, `allowFontScaling={false}` is the fix that
 * makes the symptom disappear in one line: the layout stops breaking because the
 * text stops growing. It trades a visual bug for an accessibility one, silently,
 * and the four large-text rows in native-verification-checklist.md would then
 * pass while meaning nothing.
 *
 * `maxFontSizeMultiplier` is the softer version of the same trade — a ceiling
 * rather than a wall. Banned here too: if a specific control genuinely needs one,
 * that is a deliberate decision that should edit this list and say why.
 */
const BANNED_PROPS = [
  {
    prop: "allowFontScaling",
    why: "setting it false makes text ignore the system text size entirely",
  },
  {
    prop: "maxFontSizeMultiplier",
    why: "it caps how far text may scale, which is the same trade in miniature",
  },
];

/**
 * Tracked source under apps/mobile, from git rather than a directory walk — the
 * same approach as deprecatedImports.test.mjs, and for the same reason: a walk
 * needs a skip list kept in step with .gitignore by hand, and that already
 * drifted once. Asking git covers exactly the committed source by construction.
 */
async function sourceFiles() {
  const { stdout } = await run("git", ["ls-files", "-z", "--", "."], { cwd: MOBILE_ROOT });
  return stdout.split("\0").filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f));
}

test("source: nothing opts text out of the system text size", async () => {
  const scanned = await sourceFiles();
  assert.ok(scanned.length > 10, "the scan found the source tree");
  assert.ok(scanned.includes("App.tsx"), "the entry component is scanned");
  assert.ok(
    scanned.some((f) => f.startsWith("src/components/")),
    "the component tree is scanned",
  );

  const offences = [];
  for (const file of scanned) {
    const source = await readFile(path.join(MOBILE_ROOT, file), "utf8");
    for (const banned of BANNED_PROPS) {
      if (source.includes(banned.prop)) {
        offences.push(`${file} sets ${banned.prop} — ${banned.why}`);
      }
    }
  }

  assert.deepEqual(offences, [], `text-scaling opt-outs:\n${offences.join("\n")}`);
});
