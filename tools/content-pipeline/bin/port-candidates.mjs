#!/usr/bin/env node
/**
 * One-shot port of docs/content/phase0-deck.candidates.json into the editorial
 * card shape, as `status: "draft"` with zero approvals.
 *
 * Deliberately a lossy, honest port: it does NOT invent provenance. Every
 * authentic card lands at sourceTier "C" with a single non-independent citation
 * because that is what the source file actually has (16 of 20 cite one
 * listicle). The corpus is therefore expected to FAIL validation on first run —
 * that is the gate doing its job, and the editorial pass (CP-04) is what fixes
 * it. See editorial-rubric.md §7.
 *
 * Kept in the repo rather than run-and-deleted so the provenance of the ported
 * corpus is auditable.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CONTENT_ROOT } from "../lib/deck.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SOURCE = path.join(REPO_ROOT, "docs/content/phase0-deck.candidates.json");
const SLUG = "pop-voices";

/**
 * Fingerprints assigned by reading each candidate. Cards absent from this map
 * fall back to "sincere-non-sequitur"; the P5 uniqueness check will surface the
 * collisions, which is exactly the S1 pairing defect the rubric describes.
 */
const FINGERPRINTS = {
  "If only Bradley's arm was longer": "gratitude-post",
  "just setting up my twttr": "sincere-non-sequitur",
  "Chimichanga": "unprompted-food-opinion",
  "global warming": "sincere-non-sequitur",
  "is meatball an fruit": "food-taxonomy-question",
  "pickle": "food-taxonomy-question",
  "kowabunga": "travel-complaint",
  "SALE RACK": "unprompted-food-opinion",
  "cereal": "first-time-trying-x",
  "rhode island": "misread-a-word",
  "USB": "technology-bafflement",
  "Cher": "band-name-pun",
  "wanna feel old": "wanna-feel-old",
  "TSA": "dialogue-with-stranger",
  "Uber": "dialogue-with-stranger",
  "Clouds": "aphorism",
  "fitted sheet": "domestic-appliance-defeat",
  "popcorn": "first-time-trying-x",
  "spaghetti": "unprompted-food-opinion",
  "ketchup": "food-taxonomy-question",
  "gatekeeping": "late-night-confession",
};

function fingerprintFor(statement) {
  for (const [needle, fingerprint] of Object.entries(FINGERPRINTS)) {
    if (statement.toLowerCase().includes(needle.toLowerCase())) return fingerprint;
  }
  return "sincere-non-sequitur";
}

function figureIdFor(name, seen) {
  if (seen.has(name)) return seen.get(name);
  // Deterministic UUIDv4-shaped id derived from insertion order, so re-running
  // the port produces identical files rather than churning the diff.
  const n = seen.size + 1;
  const id = `c2000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  seen.set(name, id);
  return id;
}

function toEditorialCard(card, figureId) {
  const authentic = card.authenticity === "authentic";
  return {
    id: card.id,
    figureId,
    displayName: card.displayName,
    statementText: card.statementText,
    authenticity: card.authenticity,
    category: card.category,
    difficultyPrior: card.difficulty,
    sensitivity: card.sensitivity,
    explanation: card.explanation,
    formatFingerprint: fingerprintFor(card.statementText),
    source: authentic
      ? {
          url: card.sourceUrl,
          archiveUrl: card.sourceUrl?.includes("web.archive.org") ? card.sourceUrl : null,
          publishedAt: null,
          rightsStatus: "unknown",
          verificationMethod: card.sourceUrl?.includes("web.archive.org")
            ? "web-archive"
            : "contemporaneous-article",
          retained: false,
        }
      : null,
    // Honest port: a single listicle citation is Tier C and not independent.
    sourceTier: authentic ? "C" : undefined,
    citations: authentic
      ? [{ url: card.sourceUrl, outlet: null, publishedAt: null, isPrimary: false, independent: false, independentOf: [] }]
      : undefined,
    transcriptionExact: authentic ? true : undefined,
    normalizations: authentic ? [] : undefined,
    decoyMethod: authentic ? "none" : "human",
    editorialApprovals: [],
    styleFlags: {
      hasNonstandardGrammar: false,
      punchlineInFinal20Pct: false,
      opensMidThought: false,
      hasConcreteMundaneDetail: false,
      readsFabricated: false,
      readsAuthentic: false,
    },
    eraVocabTag: "pre-2015",
    rubric: null,
    status: "draft",
    removalStatus: "active",
    disputed: false,
    calibration: { exposures: 0, groups: 0, byAudienceBucket: {} },
    editorialNotes: card.editorialNotes ?? "",
  };
}

async function main() {
  const deck = JSON.parse(await readFile(SOURCE, "utf8"));
  const figureIds = new Map();
  const voiceBanks = new Map();

  const cards = deck.cards.map((card) => {
    const figureId = figureIdFor(card.displayName, figureIds);
    if (!voiceBanks.has(figureId)) {
      voiceBanks.set(figureId, {
        figureId,
        displayName: card.displayName,
        likenessAllowed: true,
        // Empty until an editor fills it — the validator warns, which is the
        // prompt to do it. Fabricating habits here would be worse than nothing.
        voiceBank: [],
        notes: "",
      });
    }
    return toEditorialCard(card, figureId);
  });

  const cardDir = path.join(CONTENT_ROOT, "cards", SLUG);
  await mkdir(cardDir, { recursive: true });
  await mkdir(path.join(CONTENT_ROOT, "decks"), { recursive: true });
  await mkdir(path.join(CONTENT_ROOT, "playtest"), { recursive: true });

  for (const card of cards) {
    const clean = JSON.parse(JSON.stringify(card)); // drop undefined keys
    await writeFile(path.join(cardDir, `${card.id}.json`), `${JSON.stringify(clean, null, 2)}\n`);
  }

  await writeFile(
    path.join(CONTENT_ROOT, "figures.json"),
    `${JSON.stringify([...voiceBanks.values()], null, 2)}\n`,
  );

  await writeFile(
    path.join(CONTENT_ROOT, "decks", `${SLUG}.deck.json`),
    `${JSON.stringify(
      {
        deckId: deck.deckId,
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        contentVersion: deck.contentVersion,
        sensitivity: deck.sensitivity,
        tombstones: deck.tombstones ?? [],
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(`Ported ${cards.length} cards and ${voiceBanks.size} figures for '${SLUG}'.\n`);
}

await main();
