import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import packageJson from "../../package.json" with { type: "json" };

test("release prep: export scripts exist for iOS and Android smoke coverage", () => {
  assert.match(packageJson.scripts["export:ios"], /expo export --platform ios/);
  assert.match(packageJson.scripts["export:android"], /expo export --platform android/);
});

test("release prep: native verification checklist template is present and non-claiming", () => {
  const checklist = readFileSync(new URL("../../native-verification-checklist.md", import.meta.url), "utf8");
  assert.match(checklist, /Template only/i);
  assert.match(checklist, /does \*\*not\*\* claim/i);
  assert.match(checklist, /export:android/);
});
