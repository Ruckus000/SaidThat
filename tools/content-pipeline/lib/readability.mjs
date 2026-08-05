/**
 * Read-aloud fitness (rubric D3).
 *
 * The card is delivered by a friend, at volume, once, to a room, off a
 * forehead, in a bar. That is a far harsher channel than "a tweet someone
 * reads", and it is where most famously-funny tweets die: the joke is in a
 * photo, or a thread, or the line breaks, or a hashtag the reader has to decide
 * how to pronounce.
 *
 * These are mechanical proxies for an editor rating, not a replacement for it.
 * Blocking rules encode the hard gates (G5, G6); everything judgement-shaped is
 * a warning so it lands in the report without failing CI.
 */

import { block, result, warn } from "./issues.mjs";

export const MAX_READ_ALOUD_LENGTH = 180; // G5 — roughly 9 seconds aloud
export const COMFORTABLE_LENGTH = 140;
export const MIN_LENGTH = 25;

const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/u;
const MENTION_RE = /(^|\s)@[\p{L}\p{N}_]+/u;
const URL_RE = /(https?:\/\/|www\.)/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

/**
 * Deixis with no in-card referent: "look at this", "pictured below". The card
 * is shown without media, so these point at nothing.
 */
const IMAGE_DEIXIS_RE = /\b(pictured|screenshot|this photo|this pic|look at this|check this out|see below|above)\b|[↓👇⬇]/i;

/** Thread markers — the card is one post, so a continuation is unreadable. */
const THREAD_RE = /\b(\d\s*\/\s*\d|cont\.|continued|thread)\b|^\.\.\./i;

const VOWEL_RE = /[aeiouy]/i;

export function sentenceCount(text) {
  const parts = String(text)
    .split(/[.!?]+(?:\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

/**
 * Standard abbreviations a reader expands out loud without thinking. They have
 * no vowels but are not hard to say, so the vowel rule must not catch them.
 */
const SPOKEN_ABBREVIATIONS = new Set([
  "blvd", "st", "rd", "ave", "dr", "mr", "mrs", "ms", "sgt", "jr", "sr",
  "tv", "dvd", "cd", "pm", "am", "mph", "kg", "km", "ft", "vs", "nyc", "dj",
]);

export function isUnpronounceable(token) {
  const bare = token.replace(/[^\p{L}\p{N}]/gu, "");
  if (bare.length === 0) return false;
  if (SPOKEN_ABBREVIATIONS.has(bare.toLowerCase())) return false;
  // Pure numbers are read as numbers, so the vowel rule must not apply to them.
  // A year ("2014") is fine aloud; a long digit string is not.
  if (/^\d+$/.test(bare)) return bare.length >= 5;
  // Letters with no vowel at all: "twttr", "brb". Short ones are usually
  // initialisms the reader spells out, so only flag from four characters.
  if (bare.length >= 4 && !VOWEL_RE.test(bare)) return true;
  return false;
}

/**
 * Where the funniest content sits is an editor judgement (styleFlags), but a
 * long card whose final clause is a large fraction of its length is structurally
 * front-loaded: the beat lands early and the room hears trailing filler.
 */
export function trailingClauseRatio(text) {
  const clauses = String(text).split(/[,.;:!?]\s+/).filter(Boolean);
  if (clauses.length < 2) return 1;
  return clauses[clauses.length - 1].length / String(text).length;
}

export function readAloudReport(card, index = 0) {
  const path = `cards[${index}].statementText`;
  const text = typeof card?.statementText === "string" ? card.statementText : "";
  if (text.length === 0) return result([]);
  const issues = [];

  if (text.length > MAX_READ_ALOUD_LENGTH) {
    issues.push(block("read-aloud.too-long", path,
      "Too long to deliver aloud in one go.", { value: text.length, limit: MAX_READ_ALOUD_LENGTH }));
  } else if (text.length > COMFORTABLE_LENGTH) {
    issues.push(warn("read-aloud.long", path,
      "Above the comfortable read-aloud length; caps this card at D3 score 2.",
      { value: text.length, limit: COMFORTABLE_LENGTH }));
  }

  // Very short cards are fine to read but are a length tell if one class
  // monopolises them — tells.mjs owns that check; here it is only a warning.
  if (text.length < MIN_LENGTH) {
    issues.push(warn("read-aloud.very-short", path,
      "Very short; confirm the authentic and fabricated pools both reach this length.",
      { value: text.length, limit: MIN_LENGTH }));
  }

  if (HASHTAG_RE.test(text)) {
    issues.push(block("read-aloud.hashtag", path,
      "Hashtags force a pronunciation decision mid-delivery (G6). Strip it and log the normalization."));
  }
  if (MENTION_RE.test(text)) {
    issues.push(block("read-aloud.mention", path, "@handles are unreadable aloud (G6)."));
  }
  if (URL_RE.test(text)) {
    issues.push(block("read-aloud.url", path, "URLs are unreadable aloud. Strip and log the normalization."));
  }
  if (/\n/.test(text)) {
    issues.push(block("read-aloud.newline", path,
      "Line breaks mean the card is a formatted list or a thread fragment (G6)."));
  }

  const quotePairs = (text.match(/["“”]/g) ?? []).length;
  if (quotePairs > 2) {
    issues.push(warn("read-aloud.quoted-dialogue", path,
      "Multiple quoted speakers need vocal characterization to land.", { value: quotePairs }));
  }

  if (IMAGE_DEIXIS_RE.test(text)) {
    issues.push(warn("read-aloud.image-dependent", path,
      "Points at media the game never shows."));
  }
  if (THREAD_RE.test(text)) {
    issues.push(warn("read-aloud.thread-dependent", path,
      "Reads as part of a thread; the room only hears this one post."));
  }
  if (EMOJI_RE.test(text)) {
    issues.push(warn("read-aloud.emoji", path,
      "Emoji are silent aloud. Strip if decorative; keep only if load-bearing."));
  }

  const unpronounceable = text.split(/\s+/).filter(isUnpronounceable);
  if (unpronounceable.length > 0) {
    issues.push(block("read-aloud.unpronounceable", path,
      "Contains a token with no clear pronunciation.", { value: unpronounceable.slice(0, 3) }));
  }

  if (sentenceCount(text) > 4) {
    issues.push(warn("read-aloud.clause-count", path,
      "More than four sentences; the room loses the thread before the beat.",
      { value: sentenceCount(text) }));
  }

  if (text.length > 100 && trailingClauseRatio(text) > 0.45) {
    issues.push(warn("read-aloud.front-loaded", path,
      "The beat appears to land early, leaving a long trailing clause."));
  }

  return result(issues);
}
