/**
 * Loading and cross-card checks for a deck.
 *
 * Cards live one-per-file so that a PR diff shows exactly which card changed
 * and a reviewer can approve cards individually. This module reassembles them
 * into the deck the gates operate on, in a stable order (by id) so that every
 * report and every emitted bundle is reproducible.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONTENT_ROOT = fileURLToPath(new URL("../content/", import.meta.url));

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function loadFigures() {
  const figures = await readJson(path.join(CONTENT_ROOT, "figures.json"));
  const byId = new Map();
  for (const figure of figures) byId.set(figure.figureId, figure);
  return { figures, byId };
}

export async function loadDeck(slug) {
  const manifest = await readJson(path.join(CONTENT_ROOT, "decks", `${slug}.deck.json`));
  const cardDir = path.join(CONTENT_ROOT, "cards", slug);
  const entries = (await readdir(cardDir)).filter((name) => name.endsWith(".json"));
  const cards = await Promise.all(entries.map((name) => readJson(path.join(cardDir, name))));
  cards.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { manifest, cards, cardDir };
}

/** Cards eligible to reach players: not tombstoned, not removed, not disputed, not retired. */
export function shippableCards(cards, manifest) {
  const tombstones = new Set(manifest?.tombstones ?? []);
  return cards.filter(
    (card) =>
      !tombstones.has(card.id) &&
      card.removalStatus === "active" &&
      card.disputed !== true &&
      card.status !== "retired" &&
      card.status !== "draft",
  );
}

export function splitByAuthenticity(cards) {
  return {
    authentic: cards.filter((card) => card.authenticity === "authentic"),
    fabricated: cards.filter((card) => card.authenticity === "fabricated"),
  };
}

/** Content words for P7 (a decoy must not be a rewrite of its authentic neighbour). */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "at", "for", "with",
  "is", "was", "are", "were", "be", "been", "it", "its", "this", "that", "these", "those",
  "i", "im", "me", "my", "you", "your", "he", "she", "they", "we", "us", "them", "his", "her",
  "just", "so", "as", "not", "no", "do", "does", "did", "have", "has", "had", "will", "would",
]);

export function contentWords(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

export function sharedContentWordCount(a, b) {
  const left = contentWords(a);
  let shared = 0;
  for (const word of contentWords(b)) if (left.has(word)) shared += 1;
  return shared;
}
