/**
 * Pure game state. Keep privacy and content-safety rules here so the UI and
 * chaos tests execute the same invariants.
 */

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

// A run is one pass through the deck, capped so large future decks still make a
// party-sized run. Cards never repeat within a run because runLength <= deck size.
export const MAX_RUN_ROUNDS = 10;

export function runLength(state) {
  return Math.min(state.cards.length, MAX_RUN_ROUNDS);
}

const NON_PLAYABLE_STATES = new Set(["disputed", "source-unavailable", "removed"]);
const REPORT_REASONS = new Set(["wrong-attribution", "harmful-content", "other"]);

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
 * An authentic record is never playable just because a URL exists. It needs a
 * retained source and two distinct editorial approvals. Local fixtures are
 * allowed only when the caller opts in (Expo development, never a release).
 */
export function isPlayableCard(card, { allowLocalFixtures = false } = {}) {
  if (!card || typeof card !== "object" || NON_PLAYABLE_STATES.has(card.contentState)) return false;

  if (card.fixtureOnly && ["fabricated-for-game", "fixture-authentic"].includes(card.contentState)) {
    return allowLocalFixtures;
  }

  if (card.contentState === "fabricated-for-game") {
    return hasTwoDistinctApprovals(card);
  }

  return (
    card.contentState === "authentic" &&
    card.sourceRecord?.retained === true &&
    typeof card.sourceRecord.url === "string" &&
    card.sourceRecord.url.startsWith("https://") &&
    hasTwoDistinctApprovals(card)
  );
}

export function playableCards(cards, options) {
  return Array.isArray(cards) ? cards.filter((card) => isPlayableCard(card, options)) : [];
}

export function createSession({ cards, allowLocalFixtures = false, deckVersion }) {
  const safeCards = playableCards(cards, { allowLocalFixtures });
  return {
    mode: MODES.ROOM_BEACON,
    accessRole: "holder",
    stage: safeCards.length ? STAGES.HOME : STAGES.CONTENT_UNAVAILABLE,
    cards: safeCards,
    deckVersion,
    roundIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundsPlayed: 0,
    correctCount: 0,
    committedRound: null,
    resumeStage: null,
    reportStatus: null,
    fault: safeCards.length ? null : "no-safe-playable-content",
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

export function shouldConcealScore(state) {
  return state.mode === MODES.PRIVATE_RELAY && state.stage === STAGES.PRIVATE_SHUTTER;
}

export function reportPayload(state, reason, now) {
  const card = currentCard(state);
  return {
    cardId: card?.id ?? "unknown",
    reason: REPORT_REASONS.has(reason) ? reason : "other",
    deckVersion: state.deckVersion,
    timestamp: now,
  };
}

function protectPrivateState(state, resumeStage) {
  if (state.mode !== MODES.PRIVATE_RELAY) return { ...state, stage: STAGES.PAUSED, resumeStage };
  // There is no identity proof on a shared phone. On interruption, retaining
  // a private card/result would let the next person reveal it. Fail closed by
  // discarding that private turn and presenting a fresh protected turn.
  //
  // The discard costs a card, so it must respect the run boundary exactly as
  // NEXT_ROUND does. Without this, an interruption on the last round advanced
  // roundIndex past the end: currentCard wraps modulo the deck and re-serves a
  // card the room already played (and already saw the truth for), the pill reads
  // "ROUND 8 / 7", and answering it inflates the recap past the run length.
  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= runLength(state)) {
    // Nothing protected is left to hand off. Recap holds no card, so it needs
    // no shutter — the same reasoning NEXT_ROUND uses at the run boundary.
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
    privateRecovery: "discarded-prior-turn",
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
};

export function gameReducer(state, action) {
  switch (action.type) {
    case "OPEN_SETUP":
      return { ...state, stage: STAGES.SETUP, reportStatus: null };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_ACCESS_ROLE":
      return { ...state, accessRole: action.accessRole };
    case "START_ROUND":
      // Every start from setup is a fresh run: reset counters so a previously
      // completed run cannot resume on its last card and re-trigger the recap.
      return state.cards.length
        ? { ...state, ...FRESH_RUN, stage: STAGES.ROUND }
        : { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
    case "ANSWER": {
      if (state.stage !== STAGES.ROUND || state.committedRound === state.roundIndex) return state;
      const card = currentCard(state);
      const correct = Boolean(card?.authentic) === action.guessAuthentic;
      // Streak is a pure game-skill reward (how many the room read correctly in
      // a row). It never encodes or celebrates a truth verdict, only play skill.
      const streak = correct ? (state.streak ?? 0) + 1 : 0;
      return {
        ...state,
        stage: STAGES.RESULT,
        committedRound: state.roundIndex,
        score: correct ? state.score + 100 : state.score,
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
      // Rematch: keep the room's mode/role, start a brand-new run. An optional
      // freshly shuffled deck (built in the UI layer) gives variety; fall back to
      // the current playable cards. Fail closed if nothing is playable.
      const safeCards = action.cards
        ? playableCards(action.cards, { allowLocalFixtures: action.allowLocalFixtures })
        : state.cards;
      if (!safeCards.length) {
        return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
      }
      return { ...state, ...FRESH_RUN, cards: safeCards, stage: STAGES.ROUND };
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
    case "REPORT_QUEUED":
      return { ...state, reportStatus: "queued" };
    case "REPORT_FAILED":
      return { ...state, reportStatus: "failed" };
    case "SIMULATE_CORRUPT_DECK":
      return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, cards: [], fault: "corrupt-deck" };
    case "GO_HOME":
      return { ...state, stage: STAGES.HOME, reportStatus: null, resumeStage: null };
    case "RESET_LOCAL_SESSION":
      return createSession({
        cards: action.cards,
        allowLocalFixtures: action.allowLocalFixtures,
        deckVersion: action.deckVersion,
      });
    default:
      return state;
  }
}
