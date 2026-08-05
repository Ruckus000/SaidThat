/**
 * Safety screen (rubric D6) — the banned categories from content-operations.md §3.
 *
 * Deliberately a lexicon and not a classifier. A lexicon fails loudly, is
 * reviewable in a diff, and can be argued with; a model would fail quietly and
 * give an editor false confidence. This is a backstop *behind* human editorial
 * review, never a replacement for it — a clean run here means "nothing obvious
 * was caught", not "this card is safe".
 *
 * Fabricated cards are screened harder than authentic ones: an authentic quote
 * that mentions a crime is a fact about the world, whereas a fabricated one is
 * us putting words in someone's mouth.
 */

import { block, result, warn } from "./issues.mjs";
import { sensitivityRank } from "./schema.mjs";

/**
 * Each entry: which banned category, the patterns, and whether a hit is fatal
 * for any card or only for a fabricated one.
 */
export const SAFETY_LEXICON = [
  {
    category: "crime",
    scope: "fabricated",
    patterns: [
      /\b(arrested|convicted|indicted|felony|stole|shoplift(?:ed|ing)?|smuggl(?:ed|ing)|assaulted|murder(?:ed)?|fraud|embezzl)/i,
    ],
  },
  {
    category: "hate",
    scope: "any",
    patterns: [
      /\b(go back to your (own )?country|subhuman|vermin|ethnic cleansing)\b/i,
      /\b(hate|despise)\s+(all\s+)?(jews|muslims|christians|blacks|whites|asians|gays|immigrants|women|men)\b/i,
    ],
  },
  {
    category: "sexual",
    scope: "any",
    patterns: [
      /\b(safe ?word|blow ?job|porn(?:hub)?|nudes?|orgasm|fetish|kink|sexting|onlyfans)\b/i,
      /\b(in bed|sleep with|sleeping with|hook(?:ed|ing) up with)\b/i,
    ],
  },
  {
    category: "medical-financial-advice",
    scope: "fabricated",
    patterns: [
      /\b(cures?|treats?|prevents?)\s+(cancer|covid|autism|diabetes|aids)\b/i,
      /\b(vaccines? (cause|causes)|don'?t take your meds|stop taking)\b/i,
      /\b(buy|sell|short|invest in|dump)\s+\$?[A-Z]{2,5}\b/,
      /\b(guaranteed returns?|get rich quick|this stock will|crypto will (moon|hit))\b/i,
    ],
  },
  {
    category: "election-falsehood",
    scope: "any",
    patterns: [
      /\b(rigged|stolen|fraudulent)\s+(election|vote|ballot)/i,
      // Both word orders: "rigged election" and "the election was rigged".
      /\b(election|vote|ballot)s?\b[^.!?]{0,30}\b(was|were|is|are|got)\s+(rigged|stolen|fraudulent)/i,
      /\b(don'?t bother voting|your vote (won'?t|doesn'?t) count)\b/i,
    ],
  },
  {
    category: "minors",
    scope: "any",
    patterns: [/\b(my|his|her|their)\s+(\d{1,2}[- ]year[- ]old|toddler|kid|kids|child|children|baby|daughter|son)\b/i],
  },
];

/**
 * Screenshot-travel risk (D6 anchor 3): a fabricated statement asserting
 * something checkable about the world is the kind of thing that gets cropped
 * out of the game and shared as real.
 */
const CHECKABLE_CLAIM_RE =
  /\b(i (?:am|'m) (?:dating|divorcing|marrying|quitting|leaving|suing|pregnant))|\b(announc(?:e|ing)|confirm(?:s|ing)?|denies)\b|\b(diagnosed|in rehab|in hospital|filed for)\b/i;

/**
 * Ordinary English words that routinely appear capitalised at a sentence start.
 * Anything outside this set, capitalised and standing alone, is treated as a
 * name. Extend it when a false positive is confirmed in review, not to silence
 * a specific card.
 */
const COMMON_OPENERS = new Set([
  "i", "the", "a", "an", "my", "we", "they", "it", "this", "that", "but", "and", "so",
  "someone", "somebody", "everyone", "everybody", "nobody", "anyone", "no", "yes", "ok", "okay",
  "there", "here", "what", "when", "where", "why", "how", "who", "if", "just", "still", "also",
  "today", "tonight", "yesterday", "tomorrow", "sometimes", "always", "never", "maybe", "well",
  "you", "your", "he", "she", "his", "her", "our", "their", "these", "those", "all", "some",
  "one", "two", "first", "last", "next", "every", "another", "not", "now", "then", "once",
  "after", "before", "because", "while", "since", "until", "for", "with", "without", "about",
  "update", "anyway", "honestly", "apparently", "finally", "genuinely", "currently",
]);

/** Words safe mid-sentence but suspicious sentence-initially (currently none). */
const COMMON_MIDSENTENCE = new Set([]);

/**
 * Capitalised names in the statement that are not the attributed figure.
 *
 * Returns two lists, because the two cases have genuinely different confidence
 * and collapsing them produces either misses or noise:
 *
 *   `certain`  — a multi-word capitalised sequence ("Tony Hawk", "Home Alone"),
 *                or a lone capitalised word appearing mid-sentence. Ordinary
 *                prose does not capitalise mid-sentence, so these are names.
 *   `possible` — a lone capitalised word at a sentence start. "Blake says…"
 *                and "Tried to return…" are indistinguishable by pattern, so
 *                the editor decides.
 *
 * Title-Case statements are exempted from extraction entirely: when every word
 * is capitalised, capitalisation carries no name information at all, and
 * treating the sentence as one long proper noun is pure noise.
 */
export function otherProperNouns(text, displayName) {
  const value = String(text);
  const own = new Set(String(displayName ?? "").split(/\s+/).filter(Boolean));
  const certain = new Set();
  const possible = new Set();

  const words = value.split(/\s+/).filter(Boolean);
  const capitalised = words.filter((word) => /^[A-Z]/.test(word)).length;
  if (words.length >= 4 && capitalised / words.length > 0.6) {
    return { certain: [], possible: [], titleCase: true };
  }

  // Hyphens and apostrophes stay inside a token so "Wi-Fi" is one word.
  const re = /\b[A-Z][a-z]+(?:['’-][A-Za-z]+)*(?:\s+[A-Z][a-z]+(?:['’-][A-Za-z]+)*)*\b/g;

  for (let match = re.exec(value); match !== null; match = re.exec(value)) {
    const parts = match[0].split(/\s+/);
    if (parts.every((part) => own.has(part))) continue;

    if (parts.length > 1) {
      certain.add(match[0]);
      continue;
    }
    if (COMMON_OPENERS.has(parts[0].toLowerCase())) continue;

    // Trailing quote marks must not hide the terminator: in
    // `"You skate?" Me: "A little."` the word Me does start a sentence.
    const before = value.slice(0, match.index).trimEnd().replace(/["'’”]+$/, "");
    const sentenceInitial = before.length === 0 || /[.!?:]$/.test(before);
    if (sentenceInitial) possible.add(match[0]);
    else certain.add(match[0]);
  }
  return { certain: [...certain], possible: [...possible], titleCase: false };
}

export function safetyReport(card, { manifest, index = 0 } = {}) {
  const path = `cards[${index}]`;
  const text = typeof card?.statementText === "string" ? card.statementText : "";
  if (text.length === 0) return result([]);
  const issues = [];
  const fabricated = card.authenticity === "fabricated";

  for (const entry of SAFETY_LEXICON) {
    if (entry.scope === "fabricated" && !fabricated) continue;
    for (const pattern of entry.patterns) {
      const hit = text.match(pattern);
      if (!hit) continue;
      issues.push(block(`safety.${entry.category}`, `${path}.statementText`,
        `Matches the banned '${entry.category}' category.`, { value: hit[0] }));
      break;
    }
  }

  if (fabricated) {
    // G11 — a fabricated statement must not name a real person other than the
    // figure it is attributed to.
    const { certain, possible, titleCase } = otherProperNouns(text, card.displayName);
    if (certain.length > 0) {
      // Deliberately not claiming to tell a person from a brand — that would
      // need entity resolution this gate does not have. Both need an editor:
      // a real person is G11 (reject), a live trademark is D6 anchor 4
      // (second-editor sign-off). The message says what was actually found.
      issues.push(block("safety.third-party-named", `${path}.statementText`,
        "A fabricated statement names an entity other than the attributed figure — reject if a real person (G11), sign off if a brand or title (D6).",
        { value: certain }));
    }
    if (possible.length > 0) {
      issues.push(warn("safety.possible-third-party", `${path}.statementText`,
        "Sentence-initial capitalised word may be a name — confirm it is not a real third party (G11).",
        { value: possible }));
    }
    if (titleCase) {
      issues.push(warn("safety.title-case-unscanned", `${path}.statementText`,
        "Title Case statement: name detection was skipped, so check for third parties by eye."));
    }
    if (CHECKABLE_CLAIM_RE.test(text)) {
      issues.push(block("safety.checkable-claim", `${path}.statementText`,
        "A fabricated statement making a checkable claim about the world travels as a real screenshot."));
    }
  }

  // G10 / P10 — sensitivity containment.
  if (manifest && sensitivityRank(card.sensitivity) > sensitivityRank(manifest.sensitivity)) {
    issues.push(block("safety.sensitivity-containment", `${path}.sensitivity`,
      "Card sensitivity exceeds the deck's declared sensitivity (G10).",
      { value: card.sensitivity, limit: manifest.sensitivity }));
  }

  if (card.sensitivity !== "everyone") {
    issues.push(warn("safety.elevated-sensitivity", `${path}.sensitivity`,
      "Above 'everyone' — needs the second-editor sign-off recorded in editorialNotes.",
      { value: card.sensitivity }));
  }

  return result(issues);
}
