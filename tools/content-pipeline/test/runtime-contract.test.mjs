/**
 * Pins the content-pipeline projection to the app's contentRules vocabulary.
 *
 * The pipeline may import contentRules (build tools → app is fine). The app
 * must not import the pipeline. This suite is the explicit contract that
 * deriveContentState only emits states validateDeck accepts, and that
 * authentic vs source-unavailable follows the shared retained-https helper.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_STATES,
  NON_PLAYABLE_STATES,
  hasRetainedHttpsSource,
  isHttpsUrl,
} from "../../../apps/mobile/src/domain/contentRules.js";
import { deriveContentState } from "../lib/emit.mjs";

test("runtime contract: every deriveContentState result is a known contentState", () => {
  const cases = [
    { removalStatus: "removed", disputed: false, authenticity: "authentic", source: { retained: true, url: "https://example.com" } },
    { removalStatus: "active", disputed: true, authenticity: "authentic", source: { retained: true, url: "https://example.com" } },
    { removalStatus: "active", disputed: false, authenticity: "fabricated", source: null },
    { removalStatus: "active", disputed: false, authenticity: "authentic", source: { retained: true, url: "https://example.com" } },
    { removalStatus: "active", disputed: false, authenticity: "authentic", source: { retained: true, url: "http://example.com" } },
    { removalStatus: "active", disputed: false, authenticity: "authentic", source: { retained: false, url: "https://example.com" } },
    { removalStatus: "active", disputed: false, authenticity: "authentic", source: null },
  ];

  for (const card of cases) {
    const state = deriveContentState(card);
    assert.ok(CONTENT_STATES.has(state), `unexpected state ${state}`);
  }
});

test("runtime contract: withheld states match NON_PLAYABLE_STATES", () => {
  assert.equal(deriveContentState({ removalStatus: "removed" }), "removed");
  assert.equal(deriveContentState({ removalStatus: "active", disputed: true }), "disputed");
  assert.equal(
    deriveContentState({
      removalStatus: "active",
      disputed: false,
      authenticity: "authentic",
      source: { retained: false, url: "https://example.com" },
    }),
    "source-unavailable",
  );
  for (const state of ["removed", "disputed", "source-unavailable"]) {
    assert.ok(NON_PLAYABLE_STATES.has(state), state);
  }
});

test("runtime contract: authentic requires the shared retained-https helper", () => {
  const good = { retained: true, url: "https://example.invalid/archive" };
  const http = { retained: true, url: "http://example.invalid/archive" };
  assert.equal(hasRetainedHttpsSource(good), true);
  assert.equal(isHttpsUrl(http.url), false);
  assert.equal(
    deriveContentState({
      removalStatus: "active",
      disputed: false,
      authenticity: "authentic",
      source: good,
    }),
    "authentic",
  );
  assert.equal(
    deriveContentState({
      removalStatus: "active",
      disputed: false,
      authenticity: "authentic",
      source: http,
    }),
    "source-unavailable",
  );
});
