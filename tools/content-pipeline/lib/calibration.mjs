/**
 * Merges device playtest exports and turns them into status recommendations.
 *
 * This is the half of the calibration loop that lives outside the app: the
 * device records counts, a human carries the file here, and this proposes what
 * should change. It never writes a card — flipping a status is a reviewed edit
 * to the editorial record, because a number is evidence and a decision is
 * someone's responsibility.
 *
 * The verdict thresholds are duplicated from
 * apps/mobile/src/domain/playtestPolicy.js rather than imported: the app must
 * not depend on build tooling, and the tooling must not depend on the app
 * bundle. `test/calibration.test.mjs` asserts the two agree on a shared table,
 * so a change in one that is not made in the other fails loudly.
 */

export const PLAYTEST_SCHEMA = "said-that.playtest.v1";

export const MIN_EXPOSURES = 12;
export const MIN_GROUPS = 4;
export const CONFIRM_EXPOSURES = 25;
export const CONFIRM_GROUPS = 8;
export const MIN_RETIRE_EXPOSURES = 40;
export const MIN_RETIRE_GROUPS = 12;
export const CONFIRM_BAND = [0.3, 0.8];
export const WATCH_BAND = [0.25, 0.85];
export const RETIRE_BAND = [0.15, 0.9];
export const MAX_SKIP_RATE = 0.1;
export const RETIRE_SKIP_RATE = 0.2;

const Z_90 = 1.6448536269514722;

export function wilsonInterval(successes, trials, z = Z_90) {
  if (!Number.isFinite(trials) || trials <= 0) return [0, 1];
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return [Math.max(0, (centre - spread) / denominator), Math.min(1, (centre + spread) / denominator)];
}

function within(interval, band) {
  return interval[0] >= band[0] && interval[1] <= band[1];
}

/** Sums several device exports into one per-card total. */
export function mergeExports(exports) {
  const totals = new Map();
  for (const payload of exports) {
    if (payload?.schema !== PLAYTEST_SCHEMA) {
      throw new Error(`Unrecognised playtest schema: ${payload?.schema ?? "missing"}`);
    }
    for (const card of payload.cards ?? []) {
      const entry = totals.get(card.cardId) ?? { answered: 0, correct: 0, skips: 0, laughs: 0, groups: 0 };
      totals.set(card.cardId, {
        answered: entry.answered + (card.answered ?? 0),
        correct: entry.correct + (card.correct ?? 0),
        skips: entry.skips + (card.skips ?? 0),
        laughs: entry.laughs + (card.laughs ?? 0),
        groups: entry.groups + (card.groups ?? 0),
      });
    }
  }
  return totals;
}

export function verdictFor(entry, { reported = false } = {}) {
  if (reported) return "retire";
  const answered = entry.answered ?? 0;
  const exposures = answered + (entry.skips ?? 0);
  const groups = entry.groups ?? 0;
  const skipRate = exposures > 0 ? (entry.skips ?? 0) / exposures : 0;
  const interval = wilsonInterval(entry.correct ?? 0, answered);

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
  if (interval[1] < WATCH_BAND[0] || interval[0] > WATCH_BAND[1]) return "watch";
  return "keep";
}

const NEXT_STATUS = { confirm: "confirmed", watch: "watch", retire: "retired" };

/**
 * Proposed status transitions, given the merged totals and the current cards.
 *
 * Returns only cards whose status would actually change, so an editor reads a
 * short list of decisions rather than a table of everything.
 */
export function proposeTransitions(cards, totals) {
  const proposals = [];
  for (const card of cards) {
    const entry = totals.get(card.id);
    if (!entry) continue;
    const verdict = verdictFor(entry);
    const next = NEXT_STATUS[verdict];
    if (!next || next === card.status) continue;
    // A confirmed card is never quietly downgraded to "watch" by a thin later
    // sample; that needs the trailing-window drift check, which requires
    // ordered data this export deliberately does not carry.
    if (card.status === "confirmed" && verdict === "watch") continue;
    const answered = entry.answered ?? 0;
    proposals.push({
      cardId: card.id,
      displayName: card.displayName,
      from: card.status,
      to: next,
      verdict,
      correctRate: answered > 0 ? entry.correct / answered : null,
      interval: wilsonInterval(entry.correct ?? 0, answered),
      exposures: answered + (entry.skips ?? 0),
      groups: entry.groups ?? 0,
      laughShare: (entry.groups ?? 0) > 0 ? (entry.laughs ?? 0) / entry.groups : 0,
    });
  }
  return proposals;
}
