/**
 * Runs every gate over a loaded deck.
 *
 * Two shapes of gate, and they fail differently on purpose:
 *
 *   Per-card  (schema, provenance, read-aloud, safety) — a defect belongs to
 *             one card. That card is withheld; the rest of the deck is fine.
 *   Deck-level (composition, tell leakage) — a defect is a property of the SET.
 *             There is no single card to withhold, so these block the build.
 *
 * Collapsing the two is what made the build all-or-nothing: a hashtag in one
 * card is not a reason to ship zero cards, but a deck whose fabricated half is
 * identifiable from surface style alone genuinely cannot ship at all.
 *
 * Kept separate from bin/validate.mjs so tests can assert on the issue list
 * directly instead of parsing stdout.
 */

import { mergeResults, result, warn } from "./issues.mjs";
import { validateDeckManifest, validateEditorialCard, validateFigure } from "./schema.mjs";
import { readAloudReport } from "./readability.mjs";
import { safetyReport } from "./safety.mjs";
import { compositionReport } from "./composition.mjs";
import { deckTellReport } from "./tells.mjs";
import { shippableCards } from "./deck.mjs";

/** Per-card gates only. Returns one merged result for a single card. */
export function validateCard(card, { manifest, figures, index = 0 }) {
  return mergeResults(
    validateEditorialCard(card, { figures, index }),
    readAloudReport(card, index),
    safetyReport(card, { manifest, index }),
  );
}

/**
 * Partitions the deck into cards that may be emitted and cards that may not,
 * with the reason attached to each rejection.
 *
 * A card must clear BOTH bars: its own gates, and its editorial lifecycle
 * (past draft, not retired/removed/disputed/tombstoned).
 */
export function partitionCards({ manifest, cards, figures }) {
  const byId = figures instanceof Map ? figures : new Map((figures ?? []).map((f) => [f.figureId, f]));
  const lifecycleOk = new Set(shippableCards(cards, manifest).map((card) => card.id));

  const shippable = [];
  const withheld = [];

  cards.forEach((card, index) => {
    const outcome = validateCard(card, { manifest, figures: byId, index });
    const blocking = outcome.issues.filter((entry) => entry.level === "block");
    if (blocking.length > 0) {
      withheld.push({ card, reason: "blocked", issues: blocking });
    } else if (!lifecycleOk.has(card.id)) {
      withheld.push({ card, reason: `status:${card.status ?? "unknown"}`, issues: [] });
    } else {
      shippable.push(card);
    }
  });

  return { shippable, withheld, perCard: cards.map((card, index) => validateCard(card, { manifest, figures: byId, index })) };
}

/**
 * Full report for `bin/validate.mjs` and `bin/report.mjs`: every gate over
 * every card, plus deck-level gates over the set that would actually ship.
 *
 * `ok` here means "the deck is clean", which is stricter than "the deck can be
 * built" — see buildability() for the latter.
 */
export function validateAll({ manifest, cards, figures }) {
  const byId = figures instanceof Map ? figures : new Map((figures ?? []).map((f) => [f.figureId, f]));
  const figureResults = [...byId.values()].map((figure, index) => validateFigure(figure, index));
  const { shippable, perCard } = partitionCards({ manifest, cards, figures: byId });

  if (shippable.length === 0) {
    return mergeResults(
      validateDeckManifest(manifest),
      ...figureResults,
      ...perCard,
      result([
        warn("composition.no-shippable-cards", "deck.cards",
          "No card clears both its own gates and its editorial status, so deck composition and tell-leakage gates were skipped."),
      ]),
    );
  }

  return mergeResults(
    validateDeckManifest(manifest),
    ...figureResults,
    ...perCard,
    compositionReport(shippable),
    deckTellReport(shippable),
  );
}

/**
 * Can a bundle be emitted, and from which cards?
 *
 * Withholding a defective card is normal operation, not a failure — the build
 * reports what it dropped and carries on. It refuses only when the emitted SET
 * is itself unsound: an empty deck, a broken manifest, or a deck that leaks
 * authenticity through surface style.
 */
export function buildability({ manifest, cards, figures }) {
  const byId = figures instanceof Map ? figures : new Map((figures ?? []).map((f) => [f.figureId, f]));
  const { shippable, withheld } = partitionCards({ manifest, cards, figures: byId });

  const manifestResult = validateDeckManifest(manifest);
  if (!manifestResult.ok) {
    return { ok: false, shippable, withheld, deckIssues: manifestResult.issues, reason: "manifest" };
  }
  if (shippable.length === 0) {
    return { ok: false, shippable, withheld, deckIssues: [], reason: "no-shippable-cards" };
  }

  const deckResult = mergeResults(compositionReport(shippable), deckTellReport(shippable));
  const deckIssues = deckResult.issues.filter((entry) => entry.level === "block");
  return {
    ok: deckIssues.length === 0,
    shippable,
    withheld,
    deckIssues,
    reason: deckIssues.length === 0 ? null : "deck-level",
  };
}
