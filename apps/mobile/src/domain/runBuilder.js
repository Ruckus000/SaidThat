import { seededShuffle } from "./rng.js";

/**
 * Builds one 10-card run out of the playable pool.
 *
 * The deck is a pool; the RUN is the product. A plain shuffle produces a
 * perfectly valid deck that plays badly: three of the same answer in a row and
 * the room starts guessing the sequence instead of the cards; the same figure
 * twice and the second card is free; the funniest card at slot 1 and everything
 * after it is a decline.
 *
 * Deterministic given a seed, so a run can be replayed exactly in a test and
 * the reducer stays a pure function of (state, action) — the seed is data,
 * passed in on the action.
 *
 * See docs/content/editorial-rubric.md §6 for why each constraint exists.
 */

export const RUN_LENGTH = 10;

/**
 * Difficulty target per slot: warm up, ramp, humble them at 5, peak at 8, hardest
 * at 9, then land on an authentic reveal.
 */
export const DIFFICULTY_RAMP = [1, 1, 2, 2, 3, 3, 3, 4, 4, 5];

/** Slot 0 must be gentle; slot 9 must be authentic and land well. */
const WARMUP_MAX_DIFFICULTY = 2;
const BEST_CARD_MIN_SLOT = 3;
const MAX_SAME_ANSWER_RUN = 2;
const CATEGORY_WINDOW = 3;

export const WEIGHTS = {
  difficulty: 3,
  categoryRecency: 4,
  streak: 6,
  quality: 2,
};

function difficultyOf(card) {
  return Number.isInteger(card?.difficultyPrior) ? card.difficultyPrior : 3;
}

function qualityOf(card) {
  // Confirmed cards have survived calibration; prefer them, but never require
  // them, or a fresh deck could not build a run at all.
  if (card?.tier === "confirmed") return 1;
  if (card?.tier === "provisional") return 0.5;
  return 0.25;
}

function figureKey(card) {
  return card?.figureId ?? card?.person ?? card?.id;
}

/**
 * Structural constraints: repeating a figure or a joke format inside one run
 * makes the second card nearly free once the room has seen the first.
 *
 * These outrank every soft constraint, but they are not absolute. On a thin
 * pool — a dev fixture deck, or a deck with fewer distinct figures than the run
 * length — enforcing them absolutely would return a four-card run instead of a
 * ten-card one, and a short run is a worse game than a run with one repeat. So
 * they relax last, after everything else has already been given up.
 */
function violatesHardConstraint(card, chosen, level) {
  if (level < 7) {
    const key = figureKey(card);
    if (chosen.some((entry) => figureKey(entry) === key)) return true;
  }
  if (level < 6 && card.formatFingerprint) {
    if (chosen.some((entry) => entry.formatFingerprint === card.formatFingerprint)) return true;
  }
  return false;
}

/**
 * Soft constraints, checked in a fixed relaxation order. `level` is how many
 * have been given up on: at 0 all apply, and each step drops the least costly
 * remaining one so a thin pool still yields a full-length run.
 *
 * Order, least to most damaging to give up:
 *   0. category spread   — a repeated category is barely noticed
 *   1. difficulty ramp   — the room feels pacing, but cannot name it
 *   2. warm-up shape     — only affects the first two slots
 *   3. answer streak     — the most damaging, so it survives longest
 *
 * The streak rule goes last on purpose: three identical answers in a row is the
 * point where a room stops reading cards and starts playing the sequence, which
 * is a worse failure than any amount of pacing drift.
 *
 * `isFinalBodySlot` accounts for the reserved authentic closer appended after
 * the loop — without it, two authentic cards at the end of the body plus the
 * closer make a three-streak that no in-loop check would ever see.
 */
function violatesSoftConstraint(card, chosen, slot, level, isFinalBodySlot, strongest, budget) {
  // Per-class budget. Without it the greedy fill spends its fabricated cards
  // early and arrives at the last slots with only authentic ones left, which
  // forces exactly the three-in-a-row streak the rule above is meant to
  // prevent — the constraint cannot be satisfied locally once the imbalance
  // already happened.
  if (level < 4 && budget && !isFinalBodySlot) {
    const key = card.authentic ? "authentic" : "fabricated";
    const taken = chosen.filter((entry) => Boolean(entry.authentic) === Boolean(card.authentic)).length;
    if (taken >= budget[key]) return true;
  }
  // Energy should peak late. A strong slot 0 makes everything after it feel
  // like a decline, so the best card is held back — enforced here during
  // selection rather than by swapping slots afterwards, because a post-hoc swap
  // reorders cards whose placement the other constraints already depend on and
  // silently reintroduces answer streaks.
  // Compared by quality rather than identity: when several cards share the top
  // tier, holding back only one of them still opens the run on the best
  // material available.
  if (level < 3 && slot < BEST_CARD_MIN_SLOT && strongest !== null && qualityOf(card) >= strongest) return true;
  if (level < 1) {
    const recent = chosen.slice(-CATEGORY_WINDOW);
    if (recent.some((entry) => entry.category === card.category)) return true;
  }
  if (level < 2) {
    if (Math.abs(difficultyOf(card) - DIFFICULTY_RAMP[slot]) > 1) return true;
  }
  if (level < 3) {
    // Slot 0 warms the room up; slot 1 must differ in answer from slot 0.
    if (slot === 0 && difficultyOf(card) > WARMUP_MAX_DIFFICULTY) return true;
    if (slot === 1 && chosen[0] && Boolean(chosen[0].authentic) === Boolean(card.authentic)) return true;
  }
  if (level < 4) {
    const tail = chosen.slice(-MAX_SAME_ANSWER_RUN);
    if (
      tail.length === MAX_SAME_ANSWER_RUN &&
      tail.every((entry) => Boolean(entry.authentic) === Boolean(card.authentic))
    ) {
      return true;
    }
    // The slot before the reserved authentic closer must be fabricated.
    // Checking only "not two authentic in a row" is not enough: the per-class
    // budget can be exactly exhausted by this point, leaving an authentic card
    // as the only legal pick and producing A-A-A across the boundary. Fixing
    // the class here removes the possibility rather than reacting to it.
    if (isFinalBodySlot && card.authentic) return true;
    // Rooms read anti-alternation as readily as alternation. Forbidding three
    // in a row pushes hard toward a perfect ABABAB pattern, which is just as
    // guessable — so a strictly alternating tail may not be extended.
    //
    // Skipped at the final body slot, where the class is already forced:
    // applying both rules there can leave no legal card at all, and the fill
    // then relaxes past BOTH and lands on the streak this was preventing.
    if (chosen.length >= 3 && !isFinalBodySlot) {
      const tail = chosen.slice(-3).map((entry) => Boolean(entry.authentic));
      const alternating = tail[0] !== tail[1] && tail[1] !== tail[2];
      if (alternating && tail[2] !== Boolean(card.authentic)) return true;
    }
  }
  return false;
}

function slotCost(card, chosen, slot) {
  const recentIndex = chosen.map(figureKey).lastIndexOf(figureKey(card));
  let cost = WEIGHTS.difficulty * Math.abs(difficultyOf(card) - DIFFICULTY_RAMP[slot]);
  cost -= WEIGHTS.quality * qualityOf(card);
  const lastSameCategory = chosen.map((entry) => entry.category).lastIndexOf(card.category);
  if (lastSameCategory >= 0) {
    cost += WEIGHTS.categoryRecency / (chosen.length - lastSameCategory);
  }
  if (recentIndex >= 0) cost += WEIGHTS.streak;
  return cost;
}

/**
 * The closer must be authentic: the last reveal is the note the room carries
 * into the rematch prompt. A fabricated final card renders "fabricated for this
 * game" — a shrug — where an authentic one renders a fact about the world.
 * Reserved up front so the greedy fill cannot spend the last authentic card
 * early and leave nothing for slot 9.
 */
function reserveCloser(pool, length) {
  if (length < RUN_LENGTH) return { closer: null, rest: pool };
  const candidates = pool.filter((card) => card.authentic);
  if (candidates.length === 0) return { closer: null, rest: pool };
  const closer = candidates.reduce((best, card) =>
    qualityOf(card) > qualityOf(best) ? card : best,
  );
  return { closer, rest: pool.filter((card) => card !== closer) };
}

export function buildRun(cards, { length = RUN_LENGTH, seed = 1 } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const target = Math.min(length, cards.length);

  // Seeded shuffle first, so equal-cost candidates are broken consistently but
  // differently per seed. Without it every run of a given pool is identical.
  const pool = seededShuffle(cards, seed);
  const { closer, rest } = reserveCloser(pool, target);

  const chosen = [];
  const used = new Set();
  const bodyLength = closer ? target - 1 : target;
  // Top quality still in play; cards at this level are held back from the
  // opening slots so the run does not peak at slot 0.
  const strongest = rest.length > 0 ? Math.max(...rest.map(qualityOf)) : null;
  // Half the run authentic, half fabricated.
  //
  // Two slots are spoken for when a closer exists: the closer itself
  // (authentic) and the body slot before it (fabricated, so the closer cannot
  // complete a three-streak). The budget below therefore covers only the slots
  // the greedy fill actually chooses freely — subtracting the reserved pair
  // rather than the closer alone, which previously let the fill exhaust its
  // fabricated cards and deadlock the final slot.
  const authenticTotal = Math.ceil(target / 2);
  const budget = {
    authentic: authenticTotal - (closer ? 1 : 0),
    fabricated: target - authenticTotal - (closer ? 1 : 0),
  };

  for (let slot = 0; slot < bodyLength; slot += 1) {
    let pick = null;
    // Escalate through the relaxation ladder until something fits: soft
    // constraints first (levels 0-4), then all of them (5), then format reuse
    // (6), then figure reuse (7) as the last resort on a thin pool.
    for (let level = 0; level <= 7 && !pick; level += 1) {
      let bestCost = Infinity;
      for (const card of rest) {
        if (used.has(card)) continue;
        if (violatesHardConstraint(card, chosen, level)) continue;
        const finalBodySlot = slot === bodyLength - 1 && Boolean(closer);
        if (level < 5 && violatesSoftConstraint(card, chosen, slot, level, finalBodySlot, strongest, budget)) {
          continue;
        }
        const cost = slotCost(card, chosen, slot);
        if (cost < bestCost) {
          bestCost = cost;
          pick = card;
        }
      }
    }
    if (!pick) break; // pool exhausted by hard constraints; return a shorter run
    used.add(pick);
    chosen.push(pick);
  }

  if (closer) chosen.push(closer);
  return chosen;
}

/**
 * Reports which run-composition rules a built run breaks. Test and debug only —
 * nothing in the app branches on it. buildRun degrades gracefully on a thin
 * pool, so violations here are informative rather than fatal.
 */
export function runQualityReport(run) {
  const violations = [];
  if (!Array.isArray(run) || run.length === 0) return { violations: ["empty-run"] };

  const figures = run.map(figureKey);
  if (new Set(figures).size !== figures.length) violations.push("repeated-figure");

  const fingerprints = run.map((card) => card.formatFingerprint).filter(Boolean);
  if (new Set(fingerprints).size !== fingerprints.length) violations.push("repeated-fingerprint");

  for (let i = 2; i < run.length; i += 1) {
    const a = Boolean(run[i].authentic);
    if (a === Boolean(run[i - 1].authentic) && a === Boolean(run[i - 2].authentic)) {
      violations.push("three-consecutive-same-answer");
      break;
    }
  }

  if (run.length === RUN_LENGTH) {
    if (!run[run.length - 1].authentic) violations.push("closer-not-authentic");
    const authentic = run.filter((card) => card.authentic).length;
    if (authentic < 4 || authentic > 6) violations.push("answer-balance");
    const pattern = run.map((card) => (card.authentic ? 1 : 0));
    if (pattern.every((bit, i) => i === 0 || bit !== pattern[i - 1])) violations.push("strictly-alternating");
  }

  return { violations };
}
