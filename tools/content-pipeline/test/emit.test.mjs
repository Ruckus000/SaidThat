import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBundle,
  deriveContentState,
  normalizeTypography,
  renderBundleModule,
  sourceChecksum,
  toRuntimeCard,
} from "../lib/emit.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function editorial(overrides = {}) {
  return {
    id: "b1000000-0000-4000-8000-000000000001",
    figureId: "c2000000-0000-4000-8000-000000000001",
    displayName: "A Public Figure",
    statementText: "is meatball an fruit",
    authenticity: "authentic",
    category: "music",
    sensitivity: "everyone",
    explanation: "Posted in 2018 and widely recirculated.",
    difficultyPrior: 2,
    decoyMethod: "none",
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    editorialApprovals: [{ editor: "ed-a", decision: "approve" }, { editor: "ed-b", decision: "approve" }],
    source: { url: "https://example.invalid/archive", retained: true },
    editorialNotes: "internal only",
    citations: [{ url: "https://example.invalid/1", independent: true }],
    rubric: { surprise: 4, composite: 78 },
    calibration: { exposures: 12 },
    ...overrides,
  };
}

// Every row of the derivation table in the plan, in order.
test("emit: removal wins over everything else", () => {
  assert.equal(deriveContentState(editorial({ removalStatus: "removed" })), "removed");
  // Even for a card that would otherwise be perfectly playable.
  assert.equal(toRuntimeCard(editorial({ removalStatus: "removed" })).authentic, false);
});

test("emit: a disputed card is never authentic", () => {
  assert.equal(deriveContentState(editorial({ disputed: true })), "disputed");
  assert.equal(toRuntimeCard(editorial({ disputed: true })).authentic, false);
});

test("emit: a retained https source yields the authentic state", () => {
  const runtime = toRuntimeCard(editorial());
  assert.equal(runtime.contentState, "authentic");
  assert.equal(runtime.authentic, true);
  assert.deepEqual(runtime.sourceRecord, { retained: true, url: "https://example.invalid/archive" });
});

test("emit: an unretained or non-https source degrades to source-unavailable", () => {
  for (const source of [
    { url: "https://example.invalid/a", retained: false },
    { url: "http://example.invalid/a", retained: true },
    null,
  ]) {
    const runtime = toRuntimeCard(editorial({ source }));
    assert.equal(runtime.contentState, "source-unavailable", JSON.stringify(source));
    assert.equal(runtime.authentic, false);
    assert.equal(runtime.sourceRecord, undefined);
  }
});

test("emit: a fabricated card is fabricated-for-game and carries no source", () => {
  const runtime = toRuntimeCard(editorial({ authenticity: "fabricated", source: null, decoyMethod: "ai_assisted" }));
  assert.equal(runtime.contentState, "fabricated-for-game");
  assert.equal(runtime.authentic, false);
  assert.equal(runtime.sourceRecord, undefined);
  assert.equal(runtime.decoyMethod, "ai_assisted");
});

test("emit: editorial-only fields never reach the runtime record", () => {
  const runtime = toRuntimeCard(editorial());
  for (const field of ["editorialNotes", "citations", "rubric", "calibration", "difficultyPrior", "statementText", "displayName"]) {
    assert.equal(field in runtime, false, `${field} must be stripped from the bundle`);
  }
});

test("emit: approvals become a distinct string array and drop rejections", () => {
  const runtime = toRuntimeCard(
    editorial({
      editorialApprovals: [
        { editor: "ed-a", decision: "approve" },
        { editor: "ed-a", decision: "approve" },
        { editor: "ed-c", decision: "reject" },
        { editor: "ed-b", decision: "approve" },
      ],
    }),
  );
  assert.deepEqual(runtime.editorialApprovals, ["ed-a", "ed-b"]);
});

test("emit: typography is normalised on both classes, not just the authentic one", () => {
  assert.equal(normalizeTypography("it’s a “test”..."), "it's a \"test\"…");
  const fabricated = toRuntimeCard(
    editorial({ authenticity: "fabricated", source: null, decoyMethod: "human", statementText: "it’s fine..." }),
  );
  // Normalising only the pasted-from-an-article side would swap one tell for another.
  assert.equal(fabricated.quote, "it's fine…");
});

test("emit: normalisation leaves casing, spelling and grammar untouched", () => {
  const text = "Why is rhode island nor a road or an island";
  assert.equal(normalizeTypography(text), text);
  assert.equal(normalizeTypography("is meatball an fruit"), "is meatball an fruit");
});

test("emit: the bundle is ordered and the checksum is stable", () => {
  const manifest = { contentVersion: "1.0.0", tombstones: ["z", "a"] };
  const cards = [editorial({ id: "b2" }), editorial({ id: "b1" })];
  const bundle = buildBundle({ manifest, cards });
  assert.deepEqual(bundle.cards.map((c) => c.id), ["b1", "b2"]);
  assert.deepEqual(bundle.tombstones, ["a", "z"]);
  // Card order in the source must not change the checksum.
  assert.equal(
    sourceChecksum({ manifest, cards }),
    sourceChecksum({ manifest, cards: [...cards].reverse() }),
  );
});

test("emit: the rendered module is valid JS exporting the expected shape", async () => {
  const bundle = buildBundle({ manifest: { contentVersion: "1.2.3", tombstones: [] }, cards: [editorial()] });
  const rendered = renderBundleModule(bundle, "abc123");
  const mod = await import(`data:text/javascript,${encodeURIComponent(rendered)}`);
  assert.equal(mod.GENERATED_DECK_VERSION, "1.2.3");
  assert.equal(mod.GENERATED_SOURCE_SHA256, "abc123");
  assert.equal(mod.generatedCards.length, 1);
  assert.equal(mod.generatedCards[0].contentState, "authentic");
  assert.match(rendered, /do not edit by hand/);
});

test("emit: the committed bundle carries the verified deck", async () => {
  const generated = await readFile(path.join(REPO_ROOT, "apps/mobile/src/content/deck.generated.js"), "utf8");
  const mod = await import(`data:text/javascript,${encodeURIComponent(generated)}`);

  assert.ok(mod.generatedCards.length >= 10, "a run needs ten cards");
  assert.match(mod.GENERATED_DECK_VERSION, /^\d+\.\d+\.\d+$/);
  assert.match(mod.GENERATED_SOURCE_SHA256, /^[0-9a-f]{64}$/);

  // Both halves reach the bundle, and only authentic cards carry a source.
  const authentic = mod.generatedCards.filter((c) => c.authentic);
  assert.ok(authentic.length > 0 && authentic.length < mod.generatedCards.length);
  for (const card of mod.generatedCards) {
    assert.equal(card.authentic, card.contentState === "authentic");
    if (card.authentic) assert.ok(card.sourceRecord.url.startsWith("https://"), card.person);
    else assert.equal(card.sourceRecord, undefined, card.person);
  }
  // Editorial-only fields must never reach a device.
  for (const card of mod.generatedCards) {
    for (const field of ["editorialNotes", "citations", "rubric", "calibration", "difficultyPrior"]) {
      assert.equal(field in card, false, `${field} leaked into the bundle`);
    }
  }
});

test("emit: catalog.js keeps the fixture array inline for the policy test", async () => {
  const catalog = await readFile(path.join(REPO_ROOT, "apps/mobile/src/content/catalog.js"), "utf8");
  assert.match(catalog, /fixtureOnly: true/);
  assert.match(catalog, /generatedCards/);
});
