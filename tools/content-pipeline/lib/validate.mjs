/**
 * Runs every gate over a loaded deck and returns one merged result.
 *
 * Kept separate from bin/validate.mjs so the tests can assert on the issue list
 * directly instead of parsing stdout.
 */

import { mergeResults, result, warn } from "./issues.mjs";
import { validateDeckManifest, validateEditorialCard, validateFigure } from "./schema.mjs";
import { readAloudReport } from "./readability.mjs";
import { safetyReport } from "./safety.mjs";
import { compositionReport } from "./composition.mjs";
import { deckTellReport } from "./tells.mjs";
import { shippableCards } from "./deck.mjs";

export function validateAll({ manifest, cards, figures }) {
  const byId = figures instanceof Map ? figures : new Map((figures ?? []).map((f) => [f.figureId, f]));

  const perCard = cards.flatMap((card, index) => [
    validateEditorialCard(card, { figures: byId, index }),
    readAloudReport(card, index),
    safetyReport(card, { manifest, index }),
  ]);

  const figureResults = [...byId.values()].map((figure, index) => validateFigure(figure, index));

  // Deck-level gates run over what would actually ship. Running them over draft
  // cards too would report composition failures for a corpus mid-rewrite.
  //
  // When nothing is shippable yet the deck-level gates have no population to
  // measure, so they are skipped with a warning rather than reporting an empty
  // deck as a blocking composition failure — that reads as "the deck is broken"
  // when the truth is "the deck is still in draft".
  const shippable = shippableCards(cards, manifest);
  if (shippable.length === 0) {
    return mergeResults(
      validateDeckManifest(manifest),
      ...figureResults,
      ...perCard,
      result([
        warn("composition.no-shippable-cards", "deck.cards",
          "No cards are past draft, so deck composition and tell-leakage gates were skipped."),
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
