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
  PRIVATE_SHUTTER: "private-shutter",
  PAUSED: "paused",
  CONTENT_UNAVAILABLE: "content-unavailable",
};

const NON_PLAYABLE_STATES = new Set(["disputed", "source-unavailable", "removed"]);
const REPORT_REASONS = new Set(["wrong-attribution", "harmful-content", "other"]);

function hasTwoDistinctApprovals(card) {
  return new Set(card.editorialApprovals ?? []).size >= 2;
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
  return {
    ...state,
    stage: STAGES.PRIVATE_SHUTTER,
    resumeStage: STAGES.ROUND,
    roundIndex: state.roundIndex + 1,
    committedRound: null,
    lastCorrect: null,
    reportStatus: null,
    privateRecovery: "discarded-prior-turn",
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "OPEN_SETUP":
      return { ...state, stage: STAGES.SETUP, reportStatus: null };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_ACCESS_ROLE":
      return { ...state, accessRole: action.accessRole };
    case "START_ROUND":
      return state.cards.length
        ? { ...state, stage: STAGES.ROUND, committedRound: null, reportStatus: null }
        : { ...state, stage: STAGES.CONTENT_UNAVAILABLE, fault: "no-safe-playable-content" };
    case "ANSWER": {
      if (state.stage !== STAGES.ROUND || state.committedRound === state.roundIndex) return state;
      const card = currentCard(state);
      const correct = Boolean(card?.authentic) === action.guessAuthentic;
      return {
        ...state,
        stage: STAGES.RESULT,
        committedRound: state.roundIndex,
        score: correct ? state.score + 100 : state.score,
        lastCorrect: correct,
      };
    }
    case "OPEN_REVIEW":
      return state.stage === STAGES.RESULT ? { ...state, stage: STAGES.REVIEW } : state;
    case "NEXT_ROUND":
      if (state.stage !== STAGES.REVIEW && state.stage !== STAGES.RESULT) return state;
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
    case "REVEAL_PRIVATE_TURN":
      return state.stage === STAGES.PRIVATE_SHUTTER
        ? { ...state, stage: state.resumeStage ?? STAGES.ROUND, resumeStage: null, privateRecovery: null }
        : state;
    case "APP_BACKGROUND":
      return [STAGES.ROUND, STAGES.RESULT, STAGES.REVIEW].includes(state.stage)
        ? protectPrivateState(state, state.stage)
        : state;
    case "RESUME_ROOM":
      return state.stage === STAGES.PAUSED ? { ...state, stage: state.resumeStage ?? STAGES.ROUND, resumeStage: null } : state;
    case "REPORT_QUEUED":
      return { ...state, reportStatus: "queued" };
    case "REPORT_FAILED":
      return { ...state, reportStatus: "failed" };
    case "SIMULATE_CORRUPT_DECK":
      return { ...state, stage: STAGES.CONTENT_UNAVAILABLE, cards: [], fault: "corrupt-deck" };
    case "GO_HOME":
      return { ...state, stage: STAGES.HOME, reportStatus: null, resumeStage: null };
    default:
      return state;
  }
}
