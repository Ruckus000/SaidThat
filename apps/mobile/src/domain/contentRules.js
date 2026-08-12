/**
 * Shared content and run constants.
 *
 * One place for vocabulary and predicates that used to live in validateDeck,
 * game, runBuilder, ReviewScreen, and presentationLabels. The content pipeline
 * may import this module at build time (tools → app is fine). Keep it Node-safe:
 * no react-native, expo-*, or other Metro-only imports — pipeline CI loads it
 * directly. The app bundle must not import build tools the other way.
 */

/** Party-sized run length. Large decks still produce one fixed-length pass. */
export const RUN_LENGTH = 10;

/** Points awarded for one correct read. Copy and the reducer share this. */
export const POINTS_PER_CORRECT = 100;

/**
 * Every content state a runtime deck record may declare.
 *
 * "authentic" belongs here even when a given build has no authentic cards: its
 * absence was a silent data-loss bug (curated records rejected before playability
 * ran). Keep the full vocabulary here so validateDeck and the pipeline contract
 * cannot drift.
 */
export const CONTENT_STATE_VALUES = Object.freeze([
  "authentic",
  "fabricated-for-game",
  "fixture-authentic",
  "disputed",
  "source-unavailable",
  "removed",
]);

export const CONTENT_STATES = new Set(CONTENT_STATE_VALUES);

/** States that never become binary game prompts. */
export const NON_PLAYABLE_STATE_VALUES = Object.freeze([
  "disputed",
  "source-unavailable",
  "removed",
]);

export const NON_PLAYABLE_STATES = new Set(NON_PLAYABLE_STATE_VALUES);

/**
 * Id prefixes for local-only / withheld records.
 *
 * validateDeck requires fixtureOnly ids to use one of these; playtest calibration
 * excludes the same prefixes so rehearsal data cannot contaminate export stats.
 */
export const FIXTURE_ID_PREFIXES = Object.freeze(["fixture-", "withheld-"]);

/**
 * Report reason chips and the reducer allow-list share this table.
 * Unknown reasons collapse to "other" in reportPayload.
 */
export const REPORT_REASONS = Object.freeze([
  {
    code: "wrong-attribution",
    chipLabel: "WRONG ATTRIBUTION",
    accessibilityLabel: "Report wrong attribution",
  },
  {
    code: "harmful-content",
    chipLabel: "HARMFUL CONTENT",
    accessibilityLabel: "Report harmful content",
  },
  {
    code: "other",
    chipLabel: "ANOTHER ISSUE",
    accessibilityLabel: "Report another issue",
  },
]);

export const REPORT_REASON_CODES = new Set(REPORT_REASONS.map((reason) => reason.code));
export const DEFAULT_REPORT_REASON = "other";

export function isHttpsUrl(url) {
  return typeof url === "string" && url.startsWith("https://");
}

/** Retained https source — required for playable authentic editorial cards. */
export function hasRetainedHttpsSource(source) {
  return source?.retained === true && isHttpsUrl(source.url);
}

export function isFixtureOnlyId(id) {
  if (typeof id !== "string" || id.length === 0) return false;
  return FIXTURE_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Whether review/result UI should treat the card as an authentic-looking claim.
 *
 * Distinct from scoring: the reducer scores on `card.authentic` alone. Display
 * also treats fixture-authentic as authentic-looking so lime/spoken marks match
 * the simulated-authentic truth label.
 */
export function isDisplayAuthentic(card) {
  return Boolean(card?.authentic || card?.contentState === "fixture-authentic");
}

/** Same predicate the reducer uses when committing an answer. */
export function isGuessCorrect(card, guessAuthentic) {
  return Boolean(card?.authentic) === guessAuthentic;
}
