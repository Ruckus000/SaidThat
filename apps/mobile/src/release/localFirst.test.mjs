import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

import packageJson from "../../package.json" with { type: "json" };

/**
 * Guards the local-first guarantee, which three public statements now rest on:
 *
 * 1. `privacy-policy.md` — "makes no network requests, and sends no data anywhere".
 * 2. `app.json` — ITSAppUsesNonExemptEncryption: false, declared to a US export
 *    regime on the basis that there is no traffic to encrypt.
 * 3. `beta-app-review-notes.md` — told Apple the shipped source has no HTTP
 *    client call sites.
 *
 * Before this, all three were prose. Adding `fetch` anywhere in the app would
 * have made them false with nothing failing. Now the build fails first.
 *
 * This is a heuristic over source text, not a proof of no network access: a
 * native module could still open a socket, and a sufficiently indirect call
 * (`global["fe"+"tch"]`) would slip past. It catches the realistic regression —
 * someone adding an HTTP client, an analytics SDK, or a crash reporter — which
 * is the case that would actually invalidate the statements above.
 *
 * If a future version genuinely should talk to the network, this test is
 * supposed to fail. Update the policy, the export declaration and the review
 * notes in the same change, then relax it deliberately.
 */

const SHIPPED_ROOT = new URL("../", import.meta.url);
const APP_ENTRY = new URL("../../App.tsx", import.meta.url);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/** Test files ship to nobody. Everything else under src/ ends up in the bundle. */
function isTestFile(name) {
  return /\.test\.[cm]?[jt]sx?$/.test(name);
}

function collectShippedFiles(dirUrl, found = []) {
  for (const entry of readdirSync(dirUrl)) {
    const child = new URL(`${entry}`, `${dirUrl}`.endsWith("/") ? dirUrl : `${dirUrl}/`);
    if (statSync(child).isDirectory()) {
      collectShippedFiles(new URL(`${entry}/`, dirUrl), found);
      continue;
    }
    if (isTestFile(entry)) continue;
    if (!SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) continue;
    found.push(child);
  }
  return found;
}

/**
 * Strips comments before matching so that *describing* the ban does not trip it
 * — this file's own header would otherwise be a violation. Deliberately crude:
 * it can mangle a string containing "//", which risks a false pass on a URL in
 * a string literal. That trade is acceptable because string URLs are not call
 * sites, and the deck legitimately carries https:// source records as data.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

// Each entry names a way the app could acquire a network connection or start
// reporting telemetry. Matched against comment-stripped source.
const FORBIDDEN_CALL_SITES = [
  { label: "fetch()", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { label: "WebSocket", pattern: /\bWebSocket\b/ },
  { label: "EventSource", pattern: /\bEventSource\b/ },
  { label: "navigator.sendBeacon", pattern: /\bsendBeacon\s*\(/ },
  { label: "an axios import", pattern: /["']axios["']/ },
  { label: "a node http/https client", pattern: /require\(\s*["']https?["']\s*\)|from\s+["']https?["']/ },
  { label: "a Supabase client", pattern: /["']@supabase\// },
  { label: "a PostHog client", pattern: /["']posthog/i },
  { label: "a Sentry client", pattern: /["']@sentry\// },
];

test("local-first: no network call sites in shipped source", () => {
  const files = [...collectShippedFiles(SHIPPED_ROOT), APP_ENTRY];
  assert.ok(files.length > 10, "expected to have scanned the app, not an empty tree");

  const violations = [];
  for (const file of files) {
    const source = stripComments(readFileSync(file, "utf8"));
    for (const { label, pattern } of FORBIDDEN_CALL_SITES) {
      if (pattern.test(source)) {
        violations.push(`${file.pathname.split("/apps/mobile/")[1]}: ${label}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Shipped source gained a network or telemetry call site. The privacy policy, the ` +
      `ITSAppUsesNonExemptEncryption declaration and the Beta App Review notes all state ` +
      `that none exist. Update all three in this change before relaxing this test.`,
  );
});

// A dependency is a call site waiting to happen, and `eas build` bundles what is
// installed. Catching it here means the review happens when the package lands,
// not when someone first imports it.
test("local-first: no networking or telemetry packages in dependencies", () => {
  const forbidden = [
    /^axios$/,
    /^node-fetch$/,
    /^@supabase\//,
    /^posthog/,
    /^@sentry\//,
    /^@amplitude\//,
    /^@segment\//,
    /^firebase$/,
    /^@react-native-firebase\//,
  ];
  const installed = Object.keys(packageJson.dependencies ?? {});
  const matched = installed.filter((name) => forbidden.some((p) => p.test(name)));

  assert.deepEqual(
    matched,
    [],
    "A networking or telemetry dependency was added. See the note in the test above: " +
      "the privacy policy and export declaration have to change in the same commit.",
  );
});

// The statements this guard exists for have to actually be present. Without
// this, deleting the privacy policy would leave the guard passing while the
// thing it protects is gone.
test("local-first: the public statements this guard protects are present", () => {
  const policy = readFileSync(new URL("../../privacy-policy.md", import.meta.url), "utf8");
  assert.match(policy, /makes no network requests/i);
  assert.match(policy, /said-that:offline-report-queue:v1/);
  assert.match(policy, /said-that:playtest-card-stats:v1/);

  const appConfig = JSON.parse(readFileSync(new URL("../../app.json", import.meta.url), "utf8"));
  assert.equal(appConfig.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption, false);
});
