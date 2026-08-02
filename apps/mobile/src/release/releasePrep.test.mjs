import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import packageJson from "../../package.json" with { type: "json" };

test("release prep: export scripts exist for iOS and Android smoke coverage", () => {
  assert.match(packageJson.scripts["export:ios"], /expo export --platform ios/);
  assert.match(packageJson.scripts["export:android"], /expo export --platform android/);
});

// The scripts existing is not the same as CI running them. Metro prefers
// platform-specific files, so only the android export catches an Android-only
// resolution failure — and nothing else in the repo reads this workflow.
test("release prep: CI bundles both platforms, not just iOS", () => {
  const workflow = readFileSync(new URL("../../../../.github/workflows/mobile-tests.yml", import.meta.url), "utf8");
  assert.match(workflow, /expo export --platform ios/);
  assert.match(workflow, /expo export --platform android/);
});

test("release prep: native verification checklist template is present and non-claiming", () => {
  const checklist = readFileSync(new URL("../../native-verification-checklist.md", import.meta.url), "utf8");
  assert.match(checklist, /Template only/i);
  assert.match(checklist, /does \*\*not\*\* claim/i);
  assert.match(checklist, /export:android/);
});
