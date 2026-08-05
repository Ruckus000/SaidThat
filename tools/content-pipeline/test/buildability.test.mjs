import assert from "node:assert/strict";
import test from "node:test";

import { buildability, partitionCards, validateCard } from "../lib/validate.mjs";
import { loadDeck, loadFigures } from "../lib/deck.mjs";
import { FORMAT_FINGERPRINTS } from "../lib/schema.mjs";

/** Real vocabulary entries — an invented fingerprint is itself a schema failure. */
const FINGERPRINTS = [...FORMAT_FINGERPRINTS];

const FIGURE_A = "c2000000-0000-4000-8000-000000000001";
const FIGURE_B = "c2000000-0000-4000-8000-000000000002";

const figures = new Map([
  [FIGURE_A, { figureId: FIGURE_A, displayName: "Figure A", likenessAllowed: true, voiceBank: ["x"] }],
  [FIGURE_B, { figureId: FIGURE_B, displayName: "Figure B", likenessAllowed: true, voiceBank: ["x"] }],
]);

const manifest = {
  deckId: "a0000000-0000-4000-8000-000000000001",
  slug: "test",
  title: "Test",
  description: "d",
  contentVersion: "1.0.0",
  sensitivity: "everyone",
  tombstones: [],
};

let seq = 0;
function card(overrides = {}) {
  seq += 1;
  const authentic = overrides.authenticity === "authentic";
  return {
    id: `b1000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    figureId: FIGURE_A,
    displayName: "Figure A",
    statementText: `an ordinary statement number ${seq} for testing`,
    authenticity: "fabricated",
    category: "music",
    difficultyPrior: 3,
    sensitivity: "everyone",
    explanation: `Made up for the game, number ${seq}.`,
    formatFingerprint: "sincere-non-sequitur",
    source: null,
    decoyMethod: "human",
    editorialApprovals: [{ editor: "ed-a", decision: "approve" }, { editor: "ed-b", decision: "approve" }],
    styleFlags: {},
    eraVocabTag: "2020+",
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    editorialNotes: "",
    ...(authentic
      ? {
          sourceTier: "A",
          transcriptionExact: true,
          citations: [
            { url: "https://a.example/1", independent: true },
            { url: "https://b.example/2", independent: true },
          ],
          source: {
            url: "https://a.example/post",
            retained: true,
            verificationMethod: "web-archive",
            rightsStatus: "fair_use_claim",
          },
          decoyMethod: "none",
        }
      : {}),
    ...overrides,
  };
}

test("partition: a defective card is withheld and the rest survive", () => {
  seq = 0;
  const good = card();
  // A hashtag is a G6 read-aloud failure — one card's problem, not the deck's.
  const bad = card({ statementText: "best photo ever #oscars" });
  const { shippable, withheld } = partitionCards({ manifest, cards: [good, bad], figures });

  assert.deepEqual(shippable.map((c) => c.id), [good.id]);
  assert.equal(withheld.length, 1);
  assert.equal(withheld[0].reason, "blocked");
  assert.ok(withheld[0].issues.some((i) => i.code === "read-aloud.hashtag"));
});

test("partition: editorial status withholds separately from gate failures", () => {
  seq = 0;
  const shipped = card();
  const draft = card({ status: "draft", editorialApprovals: [] });
  const retired = card({ status: "retired" });
  const removed = card({ removalStatus: "removed" });
  const disputed = card({ disputed: true });

  const { shippable, withheld } = partitionCards({
    manifest,
    cards: [shipped, draft, retired, removed, disputed],
    figures,
  });

  assert.deepEqual(shippable.map((c) => c.id), [shipped.id]);
  // Reasons name the status so the build output distinguishes "broken" from
  // "not approved yet" — they need completely different follow-up.
  const reasons = withheld.map((w) => w.reason).sort();
  assert.deepEqual(reasons, ["status:draft", "status:provisional", "status:provisional", "status:retired"]);
});

test("partition: a tombstoned id is withheld even when the card is clean", () => {
  seq = 0;
  const doomed = card();
  const { shippable } = partitionCards({
    manifest: { ...manifest, tombstones: [doomed.id] },
    cards: [doomed, card()],
    figures,
  });
  assert.ok(!shippable.some((c) => c.id === doomed.id));
});

test("build: one bad card no longer zeroes the deck", () => {
  // The regression this whole change exists for: build.mjs used to gate on the
  // WHOLE deck being clean, so a single hashtag emitted nothing at all.
  seq = 0;
  const cards = [
    ...Array.from({ length: 5 }, () => card({ authenticity: "authentic" })),
    ...Array.from({ length: 5 }, () => card()),
    card({ statementText: "look at this #wow" }),
  ];
  // Spread across figures/categories/fingerprints so only the hashtag blocks.
  cards.forEach((c, i) => {
    c.figureId = i % 2 === 0 ? FIGURE_A : FIGURE_B;
    c.displayName = i % 2 === 0 ? "Figure A" : "Figure B";
    c.formatFingerprint = FINGERPRINTS[i];
  });

  const { withheld } = partitionCards({ manifest, cards, figures });
  assert.equal(withheld.filter((w) => w.reason === "blocked").length, 1);
  assert.ok(withheld.filter((w) => w.reason === "blocked")[0].issues.some((i) => i.code === "read-aloud.hashtag"));
});

test("build: an unsound emitted SET still refuses", () => {
  // Deck-level defects have no single card to withhold, so they must remain
  // fatal — otherwise the build would happily emit an all-fabricated deck.
  seq = 0;
  const cards = Array.from({ length: 12 }, (_, i) =>
    card({ formatFingerprint: FINGERPRINTS[i], figureId: i % 2 ? FIGURE_A : FIGURE_B,
      displayName: i % 2 ? "Figure A" : "Figure B" }),
  );
  const outcome = buildability({ manifest, cards, figures });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "deck-level");
  assert.ok(outcome.deckIssues.some((i) => i.code === "composition.authentic-ratio"));
});

test("build: an empty shippable set refuses with its own reason", () => {
  seq = 0;
  const outcome = buildability({
    manifest,
    cards: [card({ status: "draft", editorialApprovals: [] })],
    figures,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "no-shippable-cards");
});

test("build: a broken manifest refuses before anything is emitted", () => {
  seq = 0;
  const outcome = buildability({
    manifest: { ...manifest, contentVersion: "nope" },
    cards: [card()],
    figures,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "manifest");
});

test("validateCard: per-card gates are exactly schema, read-aloud and safety", () => {
  seq = 0;
  const res = validateCard(card({ statementText: "read this https://example.com now" }), {
    manifest,
    figures,
    index: 0,
  });
  assert.equal(res.ok, false);
  assert.ok(res.issues.some((i) => i.code === "read-aloud.url"));
});

test("build: the real corpus withholds every card, and says why", async () => {
  const { manifest: real, cards } = await loadDeck("pop-voices");
  const { byId } = await loadFigures();
  const outcome = buildability({ manifest: real, cards, figures: byId });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "no-shippable-cards");
  assert.equal(outcome.shippable.length, 0);
  assert.equal(outcome.withheld.length, 40);

  // 27 fail their own gates; the other 13 are clean but still at draft.
  const blocked = outcome.withheld.filter((w) => w.reason === "blocked");
  assert.equal(blocked.length, 27);
  assert.equal(outcome.withheld.filter((w) => w.reason === "status:draft").length, 13);

  // Every gate-clean card is fabricated, which is why promoting them alone
  // could not produce a deck: the authentic ratio would be zero.
  const cleanIds = new Set(outcome.withheld.filter((w) => w.reason !== "blocked").map((w) => w.card.id));
  assert.ok([...cleanIds].every((id) => cards.find((c) => c.id === id).authenticity === "fabricated"));
});
