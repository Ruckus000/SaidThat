import assert from "node:assert/strict";
import test from "node:test";

import { loadDeck, loadFigures, splitByAuthenticity } from "../lib/deck.mjs";
import { buildability, validateAll } from "../lib/validate.mjs";
import { OWNER_APPROVAL } from "../lib/schema.mjs";

/**
 * State of the shipped corpus.
 *
 * This file used to pin the ported candidate corpus FAILING — 20 authentic
 * cards on Tier C provenance, two exclusive style markers. That corpus was
 * replaced by verified records (see bin/seed-pop-voices.mjs), so the golden is
 * inverted rather than deleted: it now asserts the deck is clean, and any
 * regression that reintroduces laundered provenance or a style leak breaks it.
 */

test("corpus: the shipped deck passes every gate", async () => {
  const { manifest, cards } = await loadDeck("pop-voices");
  const { byId } = await loadFigures();
  const outcome = validateAll({ manifest, cards, figures: byId });

  const blocking = outcome.issues.filter((entry) => entry.level === "block");
  assert.deepEqual(blocking, [], `expected a clean deck, got: ${blocking.map((b) => b.code).join(", ")}`);
});

test("corpus: every card is emitted — nothing is silently withheld", async () => {
  const { manifest, cards } = await loadDeck("pop-voices");
  const { byId } = await loadFigures();
  const { ok, shippable, withheld } = buildability({ manifest, cards, figures: byId });

  assert.equal(ok, true);
  assert.equal(withheld.length, 0);
  assert.equal(shippable.length, cards.length);
});

test("corpus: the authenticity split is genuinely balanced", async () => {
  const { cards } = await loadDeck("pop-voices");
  const { authentic, fabricated } = splitByAuthenticity(cards);
  const ratio = authentic.length / cards.length;
  assert.ok(ratio >= 0.45 && ratio <= 0.55, `authentic share ${ratio}`);
  assert.ok(authentic.length > 0 && fabricated.length > 0);
});

test("corpus: every authentic card carries real, independent provenance", async () => {
  const { cards } = await loadDeck("pop-voices");
  for (const card of cards.filter((c) => c.authenticity === "authentic")) {
    assert.ok(["A", "B"].includes(card.sourceTier), `${card.displayName} is tier ${card.sourceTier}`);
    assert.equal(card.source.retained, true, card.displayName);
    assert.ok(card.source.url.startsWith("https://"), card.displayName);

    // Two independent RECORDS, which combine across kinds: citations, archive
    // captures of the canonical URL, and a primary transcript each count one.
    // Outlets are unreliable for wording (see editorial-rubric.md §1.3.1), so
    // requiring two of them specifically would reject the best-sourced cards.
    const independent = card.citations.filter((c) => c.independent).length;
    const captures = (card.source.captures ?? []).length;
    const primary = ["official-transcript", "institutional-archive"].includes(card.source.verificationMethod) ? 1 : 0;
    assert.ok(
      independent + captures + primary >= 2,
      `${card.displayName}: ${independent} citations + ${captures} captures + ${primary} primary`,
    );

    // Wording never comes from an article.
    assert.notEqual(card.wordingSource, "article", card.displayName);
    // A capture timestamp must be a real 14-digit Wayback stamp, never a
    // plausible-looking invention.
    for (const capture of card.source.captures ?? []) {
      assert.match(String(capture.timestamp), /^\d{14}$/, card.displayName);
    }
  }
});

test("corpus: no fabricated card carries a source, and each discloses itself", async () => {
  const { cards } = await loadDeck("pop-voices");
  for (const card of cards.filter((c) => c.authenticity === "fabricated")) {
    assert.equal(card.source, null, card.displayName);
    assert.notEqual(card.decoyMethod, "none", card.displayName);
    // The reveal has to say what was invented, not just that something was.
    assert.match(card.explanation, /made up|not a real post|written for (the|this) game|invented/i, card.displayName);
  }
});

test("corpus: no figure appears on both sides, and no two cards share a format", async () => {
  const { cards } = await loadDeck("pop-voices");
  // Pairing a figure is deliberate — it lets a decoy be texture-matched against
  // that person's real card, and it stops "have I seen this figure before"
  // being a signal. What must never happen is a figure appearing ONLY as
  // fabricated: that is a free win once a room notices (P6).
  const byFigure = new Map();
  for (const card of cards) {
    const group = byFigure.get(card.figureId) ?? [];
    group.push(card);
    byFigure.set(card.figureId, group);
  }
  for (const [, group] of byFigure) {
    if (group.length < 2) continue;
    const kinds = new Set(group.map((c) => c.authenticity));
    assert.equal(kinds.size, 2, `${group[0].displayName} has ${group.length} cards of one authenticity`);
  }

  // Not every figure is paired, on purpose: if they all were, a repeat player
  // who remembered one card was real could infer the other is fake.
  const paired = [...byFigure.values()].filter((g) => g.length > 1).length;
  assert.ok(paired > 0 && paired < byFigure.size, `${paired} of ${byFigure.size} figures paired`);

  const fingerprints = cards.map((c) => c.formatFingerprint);
  assert.equal(new Set(fingerprints).size, fingerprints.length, "format fingerprints must be unique");
});

test("corpus: every explanation is distinct — the reveal is a payoff, not boilerplate", async () => {
  const { cards } = await loadDeck("pop-voices");
  const explanations = cards.map((c) => c.explanation.trim().toLowerCase());
  assert.equal(new Set(explanations).size, explanations.length);
});

test("corpus: cards are approved, and single-approver cards say so", async () => {
  const { cards } = await loadDeck("pop-voices");
  for (const card of cards) {
    assert.notEqual(card.status, "draft", card.displayName);
    const approvers = card.editorialApprovals.map((a) => a.editor);
    assert.ok(
      approvers.length >= 2 || approvers.includes(OWNER_APPROVAL),
      `${card.displayName} is not approved`,
    );
  }
});

test("corpus: every figure has a Voice Bank", async () => {
  const { figures } = await loadFigures();
  for (const figure of figures) {
    assert.ok(Array.isArray(figure.voiceBank) && figure.voiceBank.length > 0, figure.displayName);
  }
});
