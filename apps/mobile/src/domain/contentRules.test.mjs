import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_STATE_VALUES,
  CONTENT_STATES,
  DEFAULT_REPORT_REASON,
  FIXTURE_ID_PREFIXES,
  NON_PLAYABLE_STATE_VALUES,
  NON_PLAYABLE_STATES,
  POINTS_PER_CORRECT,
  REPORT_REASONS,
  REPORT_REASON_CODES,
  RUN_LENGTH,
  hasRetainedHttpsSource,
  isDisplayAuthentic,
  isFixtureOnlyId,
  isGuessCorrect,
  isHttpsUrl,
} from "./contentRules.js";
import { MAX_RUN_ROUNDS } from "./game.js";
import { RUN_LENGTH as RUN_BUILDER_LENGTH } from "./runBuilder.js";
import { NON_CALIBRATABLE_ID_PREFIXES } from "./playtestPolicy.js";

test("contentRules: run length is one shared constant", () => {
  assert.equal(RUN_LENGTH, 10);
  assert.equal(MAX_RUN_ROUNDS, RUN_LENGTH);
  assert.equal(RUN_BUILDER_LENGTH, RUN_LENGTH);
});

test("contentRules: content-state vocabulary covers playable and withheld states", () => {
  for (const state of NON_PLAYABLE_STATE_VALUES) {
    assert.ok(CONTENT_STATES.has(state), state);
  }
  assert.ok(CONTENT_STATES.has("authentic"));
  assert.ok(CONTENT_STATES.has("fabricated-for-game"));
  assert.ok(CONTENT_STATES.has("fixture-authentic"));
  assert.equal(CONTENT_STATE_VALUES.length, CONTENT_STATES.size);
  assert.equal(NON_PLAYABLE_STATE_VALUES.length, NON_PLAYABLE_STATES.size);
});

test("contentRules: report reasons drive both chips and payload allow-list", () => {
  assert.equal(REPORT_REASONS.length, 3);
  for (const reason of REPORT_REASONS) {
    assert.ok(REPORT_REASON_CODES.has(reason.code), reason.code);
    assert.ok(reason.chipLabel);
    assert.ok(reason.accessibilityLabel);
  }
  assert.ok(REPORT_REASON_CODES.has(DEFAULT_REPORT_REASON));
});

test("contentRules: https and retained-source helpers", () => {
  assert.equal(isHttpsUrl("https://example.com/x"), true);
  assert.equal(isHttpsUrl("http://example.com/x"), false);
  assert.equal(isHttpsUrl(null), false);
  assert.equal(hasRetainedHttpsSource({ retained: true, url: "https://example.com/x" }), true);
  assert.equal(hasRetainedHttpsSource({ retained: false, url: "https://example.com/x" }), false);
  assert.equal(hasRetainedHttpsSource({ retained: true, url: "http://example.com/x" }), false);
});

test("contentRules: display authentic vs scoring guess", () => {
  assert.equal(isDisplayAuthentic({ authentic: true, contentState: "authentic" }), true);
  assert.equal(isDisplayAuthentic({ authentic: true, contentState: "fixture-authentic" }), true);
  assert.equal(isDisplayAuthentic({ authentic: false, contentState: "fixture-authentic" }), true);
  assert.equal(isDisplayAuthentic({ authentic: false, contentState: "fabricated-for-game" }), false);
  assert.equal(isGuessCorrect({ authentic: true }, true), true);
  assert.equal(isGuessCorrect({ authentic: true }, false), false);
  assert.equal(isGuessCorrect({ authentic: false }, false), true);
  assert.equal(POINTS_PER_CORRECT, 100);
});

test("contentRules: fixture id prefixes match playtest exclusion list", () => {
  assert.deepEqual([...FIXTURE_ID_PREFIXES], [...NON_CALIBRATABLE_ID_PREFIXES]);
  assert.equal(isFixtureOnlyId("fixture-ember-01"), true);
  assert.equal(isFixtureOnlyId("withheld-x"), true);
  assert.equal(isFixtureOnlyId("card-1"), false);
});
