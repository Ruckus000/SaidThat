/**
 * Pure game state. Keep privacy and content-safety rules here so the UI and
 * chaos tests execute the same invariants.
 */
import {
  DEFAULT_REPORT_REASON,
  NON_PLAYABLE_STATES,
  POINTS_PER_CORRECT,
  REPORT_REASON_CODES,
  RUN_LENGTH,
  hasRetainedHttpsSource,
  isGuessCorrect,
} from "./contentRules.js";
import { buildRun } from "./runBuilder.js";

export const MODES = {
  ROOM_BEACON: "room-beacon",
  PRIVATE_RELAY: "private-relay",
};

export const STAGES = {
  HOME: "home",
  SETUP: "setup",
  ROUND: "round",
  RESULT: "result",
  REVIEW: "review",
  RECAP: "recap",
  PRIVATE_SHUTTER: "private-shutter",
  PAUSED: "paused",
  CONTENT_UNAVAILABLE: "content-unavailable",
};

// Alias kept for existing call sites and tests; value lives in contentRules.
export const MAX_RUN_ROUNDS = RUN_LENGTH;

export function runLength(state) {
  return Math.min(state.cards.length, MAX_RUN_ROUNDS);
}

/**
 * Two distinct human approvals, counted from a list and nothing else.
 *
 * `new Set` takes any iterable, so the array check is load-bearing rather than
 * defensive typing. A single approver recorded as a string — "alice" instead of
 * ["alice"] — counts as five distinct approvals and clears the bar, which is the
 * likeliest way an editorial pipeline gets this wrong. Non-iterables (a number,
 * an object) throw instead, taking the app down at createSession rather than
 * routing to the content-unavailable screen. Anything that is not a list of
 * approvals fails closed here.
 */
function hasTwoDistinctApprovals(card) {
  if (!Array.isArray(card.editorialApprovals)) return false;
  return new Set(card.editorialApprovals).size >= 2;
}

/**
 * Pre-release owner approval, amended 2026-08-05 by owner decision.
 *
 * The two-person rule stands as the release bar. Before release there is only
 * one editor, so requiring two meant either shipping nothing or inventing a
 * second approver — and a fabricated second name is strictly worse than an
 * honest single one, because it makes the rule look satisfied while providing
 * none of the review it exists to provide.
 *
 * So a lone approval is accepted only when it is explicitly marked as the
 * owner's. The marker is a distinct value, not a name, so a card cannot slip
 * through on a coincidental match; and it stays visible in the record, so
 * "approved by one person" can be told apart from "reviewed by two" at any
 * point later.
 */
export const OWNER_APPROVAL = "owner:pre-release";

function hasOwnerApproval(card) {
  if (!Array.isArray(card.editorialApprovals)) return false;
  return card.editorialApprovals.includes(OWNER_APPROVAL);
}

function isEditoriallyApproved(card) {
  return hasTwoDistinctApprovals(card) || hasOwnerApproval(card);
}

/**
 * An authentic record is never playable just because a URL exists. It needs a
 * retained source and editorial approval — two distinct approvers, or an
 * explicit owner approval during pre-release (see OWNER_APPROVAL). Local
 * fixtures are allowed only when the caller opts in (Expo development, never a
 * release).
 */
export function isPlayableCard(card, { allowLocalFixtures = false } = {}) {
  if (!card || typeof card !== "object" || NON_PLAYABLE_STATES.has(card.contentState)) return false;

  // Display (`isDisplayAuthentic`) and scoring (`isGuessCorrect`) must agree.
  // A fixture-authentic card with authentic:false (or an authentic editorial
  // card with authentic:false) would label lime and score as fabricated.
  if (card.fixtureOnly && card.contentState === "fabricated-for-game") {
    return allowLocalFixtures && card.authentic === false;
  }
  if (card.fixtureOnly && card.contentState === "fixture-authentic") {
    return allowLocalFixtures && card.authentic === true;
  }

  if (card.contentState === "fabricated-for-game") {
    return card.authentic === false && isEditoriallyApproved(card);
  }

  return (
    card.contentState === "authentic" &&
    card.authentic === true &&
    hasRetainedHttpsSource(card.sourceRecord) &&
    isEditoriallyApproved(card)
  );
}

export function playableCards(cards, options) {
  return Array.isArray(cards) ? cards.filter((card) => isPlayableCard(card, options)) : [];
}

export function createSession({
  cards,
  allowLocalFixtures = false,
  deckVersion,
  seed = 1,
  deferRun = false,
}) {
  // `pool` is everything playable; `cards` is the run actually being played.
  // Keeping both means a rematch rebuilds from the full pool instead of
  // reshuffling the ten cards the room just saw.
  //
  // `deferRun` skips buildRun on cold start / local reset: Home does not need
  // a sampled run, and START_ROUND builds one when the player actually begins.
  const pool = playableCards(cards, { allowLocalFixtures });
  // Availability is the pool, not the deferred empty run — otherwise Home is
  // wrongly blocked whenever buildRun is postponed until START_ROUND.
  const hasContent = pool.length > 0;
  const safeCards = deferRun ? [] : buildRun(pool, { seed });
  return {
    pool,
    mode: MODES.ROOM_BEACON,
    accessRole: "holder",
    stage: hasContent ? STAGES.HOME : STAGES.CONTENT_UNAVAILABLE,
    cards: safeCards,
    deckVersion,
    // Identifies this run so a late REPORT_* from a previous rematch cannot
    // attach "Saved locally" to a new run that happens to share roundIndex 0.
    runId: seed,
    roundIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundsPlayed: 0,
    correctCount: 0,
    committedRound: null,
    resumeStage: null,
    reportStatus: null,
    privateRecovery: null,
    fault: hasContent ? null : "no-safe-playable-content",
  };
}

export function currentCard(state) {
  if (!state.cards.length) return null;
  return state.cards[state.roundIndex % state.cards.length];
}

export function canExposeCardToAssistiveTech(state) {
  return !(state.mode === MODES.ROOM_BEACON && state.accessRole === "holder");
}

export function canShowCard(state) {
  return state.stage === STAGES.ROUND || state.stage === STAGES.REVIEW;
}

export function cardForPresentation(state, { forAssistiveTech = false } = {}) {
  if (!canShowCard(state)) return null;
  if (forAssistiveTech && !canExposeCardToAssistiveTech(state)) return null;
  return currentCard(state);
}

// shouldConcealScore lived here and returned true only at PRIVATE_SHUTTER. Both
// consumers — the Header and the Round screen's own score row — render only at
// stages where it was false, so the concealed branch could never be reached.
// PrivateShutterScreen shows its own PRIVATE HANDOFF pill and no card, which is
// what actually protects the handoff; the score path was left behind when the
// header stopped rendering on that screen. Removed rather than kept as a second,
// dead copy of a privacy rule — a control that cannot engage is not protection,
// and reading like one invites trusting it.

/**
 * Whether the reducer will accept an answer for the round on screen.
 *
 * Exported because the tilt path needs to know BEFORE it fires the commit
 * haptic: on the round screen that buzz is the confirmation an answer landed, so
 * firing it for an answer the reducer then drops tells the room something that
 * did not happen. The alternative was duplicating this condition at the call
 * site, which is the same rule written twice and free to drift.
 *
 * The reducer uses this too, so the two can never disagree.
 */
export function canCommitAnswer(state) {
  return state.stage === STAGES.ROUND && state.committedRound !== state.roundIndex;
}

export function reportPayload(state, reason, now) {
  const card = currentCard(state);
  return {
    cardId: card?.id ?? "unknown",
    reason: REPORT_REASON_CODES.has(reason) ? reason : DEFAULT_REPORT_REASON,
    deckVersion: state.deckVersion,
    timestamp: now,
    // Local queue only: scopes a timed-out retry so one chip press cannot stack
    // two durable entries when the first write lands late.
    runId: state.runId,
    roundIndex: state.roundIndex,
  };
}

function protectPrivateState(state, resumeStage) {
  if (state.mode !== MODES.PRIVATE_RELAY) return { ...state, stage: STAGES.PAUSED, resumeStage };
  // There is no identity proof on a shared phone. On interruption, retaining
  // a private card/result would let the next person reveal it. Fail closed by
  // advancing past that private turn before any resume.
  //
  // The advance costs a card slot, so it must respect the run boundary exactly
  // as NEXT_ROUND does. Without this, an interruption on the last round advanced
  // roundIndex past the end: currentCard wraps modulo the deck and re-serves a
  // card the room already played (and already saw the truth for), the pill reads
  // "ROUND 8 / 7", and answering it inflates the recap past the run length.
  //
  // Recovery copy must tell the truth about scoring: an unanswered interrupt
  // discarded the turn (nothing scored); an interrupt after ANSWER keeps the
  // points and only hides the prompt from the next person.
  const answered = state.committedRound === state.roundIndex;
  const recovery = answered ? "protected-after-commit" : "discarded-prior-turn";
  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= runLength(state)) {
    // Nothing protected is left to hand off. Recap holds no card, so it needs
    // no shutter — the same reasoning NEXT_ROUND uses at the run boundary.
    // Unanswered final cards are not "completed": callers must slice recap by
    // roundsPlayed, not runLength.
    return {
      ...state,
      stage: STAGES.RECAP,
      committedRound: null,
      lastCorrect: null,
      reportStatus: null,
      resumeStage: null,
      privateRecovery: null,
    };
  }
  return {
    ...state,
    stage: STAGES.PRIVATE_SHUTTER,
    resumeStage: STAGES.ROUND,
    roundIndex: nextIndex,
    committedRound: null,
    lastCorrect: null,
    reportStatus: null,
    privateRecovery: recovery,
  };
}

// Counters that define a single run. Reset whenever a fresh run begins (starting
// from setup, or a rematch) so every run is its own scoreboard.
const FRESH_RUN = {
  roundIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  correctCount: 0,
  committedRound: null,
  reportStatus: null,
  lastCorrect: null,
  resumeStage: null,
  // A discard belongs to the run it happened in. Carrying the flag into a new
  // run would tell the next shutter that a turn it never had was thrown away.
  privateRecovery: null,
};

export function gameReducer(state, action) {
  switch (action.type) {
    case "OPEN_SETUP":
      return { ...state, stage: STAGES.SETUP, reportStatus: null };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_ACCESS_ROLE":
      return { ...state, accessRole: action.accessRole };
    case "START_ROUND": {
      // Every start from setup is a fresh run: reset counters so a previously
      // completed run cannot resume on its last card and re-trigger the recap.
      //
      // The run is rebuilt here rather than reused. Before this, only PLAY_AGAIN
      // ever reordered the deck, so the first run of every session played the
      // deck in file order.
      //
      // When createSession used deferRun, state.cards is empty until here — so
      // a missing seed still builds from the pool rather than starting empty.
      const pool = state.pool ?? state.cards;
      const cards =
        action.seed !== undefined
          ? buildRun(pool, { seed: action.seed })
          : state.cards.length
            ? state.cards
            : buildRun(pool, { seed: 1 });
      const runId = action.seed === undefined ? state.runId : action.seed;
      return cards.length
        ? { ...state, ...FRESH_RUN, cards, stage: STAGES.ROUND, runId }
        : { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
    }
    case "ANSWER": {
      if (!canCommitAnswer(state)) return state;
      const card = currentCard(state);
      const correct = isGuessCorrect(card, action.guessAuthentic);
      // Streak is a pure game-skill reward (how many the room read correctly in
      // a row). It never encodes or celebrates a truth verdict, only play skill.
      const streak = correct ? (state.streak ?? 0) + 1 : 0;
      return {
        ...state,
        stage: STAGES.RESULT,
        committedRound: state.roundIndex,
        score: correct ? state.score + POINTS_PER_CORRECT : state.score,
        lastCorrect: correct,
        streak,
        bestStreak: Math.max(state.bestStreak ?? 0, streak),
        roundsPlayed: (state.roundsPlayed ?? 0) + 1,
        correctCount: (state.correctCount ?? 0) + (correct ? 1 : 0),
      };
    }
    case "OPEN_REVIEW":
      return state.stage === STAGES.RESULT ? { ...state, stage: STAGES.REVIEW } : state;
    case "NEXT_ROUND": {
      if (state.stage !== STAGES.REVIEW && state.stage !== STAGES.RESULT) return state;
      // End of the run -> recap (both modes; recap holds no card, so Private
      // Relay needs no protective shutter here).
      if (state.roundIndex + 1 >= runLength(state)) {
        return { ...state, stage: STAGES.RECAP, committedRound: null, reportStatus: null, resumeStage: null };
      }
      if (state.mode === MODES.PRIVATE_RELAY) {
        return {
          ...state,
          stage: STAGES.PRIVATE_SHUTTER,
          resumeStage: STAGES.ROUND,
          roundIndex: state.roundIndex + 1,
          committedRound: null,
          reportStatus: null,
        };
      }
      return {
        ...state,
        stage: STAGES.ROUND,
        roundIndex: state.roundIndex + 1,
        committedRound: null,
        reportStatus: null,
      };
    }
    case "PLAY_AGAIN": {
      // Rematch: keep the room's mode/role, build a brand-new run from the full
      // pool. The seed arrives on the action, so the reducer stays a pure
      // function of (state, action) while still producing a different run each
      // time — the UI owns the entropy, this owns the selection.
      //
      // `action.cards` remains supported for callers that hand in a fresh deck
      // (a content refresh), and re-filters it because an unvalidated deck must
      // never widen what is playable.
      const pool = action.cards
        ? playableCards(action.cards, { allowLocalFixtures: action.allowLocalFixtures })
        : state.pool ?? state.cards;
      if (!pool.length) {
        return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
      }
      const safeCards = action.seed === undefined ? pool.slice(0, MAX_RUN_ROUNDS) : buildRun(pool, { seed: action.seed });
      if (!safeCards.length) {
        return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
      }
      const runId = action.seed === undefined ? state.runId : action.seed;
      return { ...state, ...FRESH_RUN, pool, cards: safeCards, stage: STAGES.ROUND, runId };
    }
    case "REVEAL_PRIVATE_TURN":
      return state.stage === STAGES.PRIVATE_SHUTTER
        ? { ...state, stage: state.resumeStage ?? STAGES.ROUND, resumeStage: null, privateRecovery: null }
        : state;
    // An involuntary interruption. There is no identity proof on a shared phone,
    // so this stays fail-closed: Private Relay discards the protected turn.
    case "APP_BACKGROUND":
      return [STAGES.ROUND, STAGES.RESULT, STAGES.REVIEW].includes(state.stage)
        ? protectPrivateState(state, state.stage)
        : state;
    // A deliberate pause, and deliberately NOT the same action. Routing the
    // "Pause and leave safely" control through APP_BACKGROUND meant that in
    // Private Relay it reached the shutter instead of PAUSED — so it neither
    // paused nor offered the exit its label promises, and it silently burned the
    // card. Nothing is discarded here: PausedScreen shows no card, quote, or
    // score, so the turn survives in both modes.
    case "REQUEST_PAUSE":
      return [STAGES.ROUND, STAGES.RESULT, STAGES.REVIEW].includes(state.stage)
        ? { ...state, stage: STAGES.PAUSED, resumeStage: state.stage }
        : state;
    case "RESUME_ROOM": {
      if (state.stage !== STAGES.PAUSED) return state;
      const resume = state.resumeStage ?? STAGES.ROUND;
      // The phone may have changed hands while paused, and the app cannot tell.
      // Re-establish the handoff ritual before the protected turn is shown again.
      // The turn itself is kept — a deliberate pause is not an interruption.
      if (state.mode === MODES.PRIVATE_RELAY) {
        return { ...state, stage: STAGES.PRIVATE_SHUTTER, resumeStage: resume };
      }
      return { ...state, stage: resume, resumeStage: null };
    }
    // Report status belongs to the round it was raised from. queueReport is
    // async, so the player can reach the next card — or the recap — while it is
    // still in flight; without this scope the confirmation lands against whatever
    // is on screen when it returns, telling the room a card was reported when
    // nothing about that card was. The write itself is unaffected: only the
    // misattributed display is dropped.
    //
    // roundIndex alone is not enough across a rematch: PLAY_AGAIN / START_ROUND
    // reset roundIndex to 0, so a late write from the previous run's round 0
    // would match the new run. runId closes that hole.
    //
    // A missing roundIndex/runId is treated as current, so a caller that does not
    // supply one keeps the old behaviour rather than silently losing its status.
    case "REPORT_QUEUED":
      if (action.runId != null && action.runId !== state.runId) return state;
      if (action.roundIndex != null && action.roundIndex !== state.roundIndex) return state;
      return { ...state, reportStatus: "queued" };
    case "REPORT_FAILED":
      if (action.runId != null && action.runId !== state.runId) return state;
      if (action.roundIndex != null && action.roundIndex !== state.roundIndex) return state;
      return { ...state, reportStatus: "failed" };
    case "SIMULATE_CORRUPT_DECK":
      return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, cards: [], fault: "corrupt-deck" };
    case "GO_HOME":
      return { ...state, stage: STAGES.HOME, reportStatus: null, resumeStage: null, privateRecovery: null };
    case "RESET_LOCAL_SESSION":
      return createSession({
        cards: action.cards,
        allowLocalFixtures: action.allowLocalFixtures,
        deckVersion: action.deckVersion,
        seed: action.seed,
        // Same cold-path deferral as App mount: reset lands on Home.
        deferRun: action.deferRun === true,
      });
    default:
      return state;
  }
}
