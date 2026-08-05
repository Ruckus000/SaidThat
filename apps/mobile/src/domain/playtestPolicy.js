/**
 * Local playtest calibration.
 *
 * The product claims cards are funny and well-calibrated. Nothing measured that
 * until now: `difficulty` was an editor's guess written into a file and never
 * checked against a room. This module turns "we think this card splits the
 * room" into an observation.
 *
 * Deliberate constraints:
 *   - Aggregates only. No timestamps per event, no round order, no device id,
 *     no player identity, no free text — the same minimisation the report
 *     payload applies, for the same reason.
 *   - No network. Data leaves the device only when a human exports it and
 *     carries the file to an editor.
 *   - Bounded. A session cannot grow this without limit.
 *
 * Verdicts use Wilson score intervals rather than raw proportions, which is the
 * whole defence against retiring a good card on a small sample: three groups
 * who happen to follow the same figure can make a five-star card look broken.
 */

export const MAX_TRACKED_CARDS = 400;
export const PLAYTEST_SCHEMA = "said-that.playtest.v1";

/**
 * Id prefixes that never belong in calibration data.
 *
 * Local fixtures are playable in development and inert in a release build, but
 * the stats outlive the build: `allowLocalFixtures` decides what is PLAYABLE,
 * not what was already RECORDED, and nothing cleared the store when a device
 * moved from a dev build to a release one. A release-config export from a
 * simulator that had earlier run a dev build carried `fixture-ember-07` and
 * `fixture-sage-03` alongside real cards — observed, not theorised.
 *
 * `import-playtest.mjs` does name and ignore ids it cannot match, so the
 * contamination was visible rather than silent. The damage is subtler than a
 * bogus verdict: dev play inflates `groups` and `answered` for the REAL cards
 * in those runs, and those counts are exactly what the Wilson intervals are
 * computed from. A card could reach the exposure floor on rehearsal rather than
 * on rooms.
 *
 * The prefixes are load-bearing, not a naming nicety: `validateDeckRecord`
 * rejects any `fixtureOnly` record whose id does not start with one of them.
 */
export const NON_CALIBRATABLE_ID_PREFIXES = ["fixture-", "withheld-"];

/** @param {unknown} cardId */
export function isCalibratableCardId(cardId) {
  if (typeof cardId !== "string" || cardId.length === 0) return false;
  return !NON_CALIBRATABLE_ID_PREFIXES.some((prefix) => cardId.startsWith(prefix));
}

/** No verdict at all below this much evidence. */
export const MIN_EXPOSURES = 12;
export const MIN_GROUPS = 4;

/** A card is never retired on fewer than this many exposures. */
export const MIN_RETIRE_EXPOSURES = 40;
export const MIN_RETIRE_GROUPS = 12;

export const CONFIRM_EXPOSURES = 25;
export const CONFIRM_GROUPS = 8;

/** The band a card's true correct-rate must sit inside to be confirmed. */
export const CONFIRM_BAND = [0.3, 0.8];
/** Outside this band a card is either obvious or arbitrary. */
export const WATCH_BAND = [0.25, 0.85];
/** Outside this band a card is beyond rescue. */
export const RETIRE_BAND = [0.15, 0.9];

export const MAX_SKIP_RATE = 0.1;
export const RETIRE_SKIP_RATE = 0.2;

const Z_90 = 1.6448536269514722; // two-sided 90%

/**
 * Wilson score interval. Unlike the normal approximation it stays inside [0,1]
 * and stays sane at small n, which is exactly the regime every early card is in.
 */
export function wilsonInterval(successes, trials, z = Z_90) {
  if (!Number.isFinite(trials) || trials <= 0) return [0, 1];
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return [
    Math.max(0, (centre - spread) / denominator),
    Math.min(1, (centre + spread) / denominator),
  ];
}

/**
 * @typedef {{ answered: number, correct: number, skips: number, laughs: number, groups: number }} CardStats
 * @typedef {{ cards: Record<string, CardStats> }} PlaytestStats
 */

/** @returns {PlaytestStats} */
export function emptyStats() {
  return { cards: {} };
}

function cardEntry(stats, cardId) {
  return stats.cards[cardId] ?? { answered: 0, correct: 0, skips: 0, laughs: 0, groups: 0 };
}

/**
 * Bounded insert. Once the cap is reached, new cards are dropped rather than
 * evicting existing ones: an editor's half-finished sample is worth more than a
 * fresh empty one, and unbounded growth is the failure this cap exists to stop.
 */
function withCard(stats, cardId, entry) {
  // The single gate on what may enter the store, which is why the fixture check
  // lives here rather than in each of the three recorders.
  if (!isCalibratableCardId(cardId)) return stats;
  if (!(cardId in stats.cards) && Object.keys(stats.cards).length >= MAX_TRACKED_CARDS) {
    return stats;
  }
  return { ...stats, cards: { ...stats.cards, [cardId]: entry } };
}

/**
 * Drop entries that should never have been recorded.
 *
 * Applied on load, so a device that collected fixture data under a dev build
 * heals itself the next time anything writes, without the player being asked to
 * reset. Returns the same object when there is nothing to drop, so the common
 * case allocates nothing and a caller can cheaply tell whether it changed.
 *
 * What this does NOT undo: exposures a REAL card accrued during dev play. Those
 * counts are indistinguishable from room play once written, so a device used
 * for development still needs RESET LOCAL SESSION before it collects data
 * meant for calibration. This removes the ids that were never eligible; it
 * cannot un-mix the ones that were.
 *
 * @param {PlaytestStats} stats
 * @returns {PlaytestStats}
 */
export function pruneStats(stats) {
  const cards = stats?.cards;
  if (!cards || typeof cards !== "object") return emptyStats();
  const keep = Object.keys(cards).filter(isCalibratableCardId);
  if (keep.length === Object.keys(cards).length) return stats;
  return { ...stats, cards: Object.fromEntries(keep.map((id) => [id, cards[id]])) };
}

/**
 * @param {PlaytestStats} stats
 * @param {{ cardId?: string, correct?: boolean, skipped?: boolean }} event
 * @returns {PlaytestStats}
 */
export function recordOutcome(stats, { cardId, correct, skipped = false }) {
  if (!cardId) return stats;
  const entry = cardEntry(stats, cardId);
  return withCard(stats, cardId, {
    ...entry,
    // A skip is not an answer: counting it would drag every rate toward zero
    // and make a confusing card look like a hard one.
    answered: entry.answered + (skipped ? 0 : 1),
    correct: entry.correct + (!skipped && correct ? 1 : 0),
    skips: entry.skips + (skipped ? 1 : 0),
  });
}

/**
 * One optional tap per completed run: which card got the biggest reaction.
 * @param {PlaytestStats} stats
 * @param {{ cardId?: string }} pick
 * @returns {PlaytestStats}
 */
export function recordLaugh(stats, { cardId }) {
  if (!cardId) return stats;
  const entry = cardEntry(stats, cardId);
  return withCard(stats, cardId, { ...entry, laughs: entry.laughs + 1 });
}

/**
 * A run counts as one group for every card it contained.
 * @param {PlaytestStats} stats
 * @param {string[]} cardIds
 * @returns {PlaytestStats}
 */
export function recordGroup(stats, cardIds) {
  if (!Array.isArray(cardIds)) return stats;
  let next = stats;
  for (const cardId of new Set(cardIds)) {
    const entry = cardEntry(next, cardId);
    next = withCard(next, cardId, { ...entry, groups: entry.groups + 1 });
  }
  return next;
}

export function derivedStats(entry) {
  const answered = entry?.answered ?? 0;
  const correctRate = answered > 0 ? entry.correct / answered : null;
  const exposures = answered + (entry?.skips ?? 0);
  return {
    answered,
    exposures,
    correctRate,
    // 1.0 at a perfect 50/50 split.
    splitQuality: correctRate === null ? null : 1 - Math.abs(2 * correctRate - 1),
    skipRate: exposures > 0 ? (entry.skips ?? 0) / exposures : 0,
    laughShare: (entry?.groups ?? 0) > 0 ? (entry.laughs ?? 0) / entry.groups : 0,
    interval: wilsonInterval(entry?.correct ?? 0, answered),
  };
}

function within(interval, band) {
  return interval[0] >= band[0] && interval[1] <= band[1];
}

/**
 * What the evidence says should happen to this card.
 *
 * Returns a recommendation, never an action: flipping a card's status is a
 * reviewed edit to the editorial record, not something a device decides.
 */
export function cardVerdict(entry, { reported = false } = {}) {
  // A harm or misattribution report overrides every statistic. One is enough,
  // and no amount of good calibration data argues with it.
  if (reported) return "retire";

  const { answered, exposures, skipRate, interval } = derivedStats(entry);
  const groups = entry?.groups ?? 0;

  if (exposures < MIN_EXPOSURES || groups < MIN_GROUPS) return "insufficient-data";

  if (exposures >= MIN_RETIRE_EXPOSURES && groups >= MIN_RETIRE_GROUPS && !within(interval, RETIRE_BAND)) {
    return "retire";
  }
  if (exposures >= CONFIRM_EXPOSURES && skipRate > RETIRE_SKIP_RATE) return "retire";

  if (
    answered >= CONFIRM_EXPOSURES &&
    groups >= CONFIRM_GROUPS &&
    within(interval, CONFIRM_BAND) &&
    skipRate < MAX_SKIP_RATE
  ) {
    return "confirm";
  }

  // Entirely outside the band — too easy, or arbitrary. "watch" exists so
  // suspicion has somewhere to go that is not the bin.
  if (interval[1] < WATCH_BAND[0] || interval[0] > WATCH_BAND[1]) return "watch";

  return "keep";
}

/**
 * Export payload. Aggregates only — assert the key set in tests, because this
 * is the one structure that leaves the device.
 */
export function toExport(stats, deckVersion) {
  return {
    schema: PLAYTEST_SCHEMA,
    deckVersion,
    cards: Object.entries(stats.cards ?? {}).map(([cardId, entry]) => ({
      cardId,
      answered: entry.answered,
      correct: entry.correct,
      skips: entry.skips,
      laughs: entry.laughs,
      groups: entry.groups,
    })),
  };
}
