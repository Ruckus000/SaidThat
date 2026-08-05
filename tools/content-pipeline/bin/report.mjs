#!/usr/bin/env node
/**
 * Human-readable deck scorecard for editors.
 *
 * Unlike validate.mjs this never fails: it is the thing you run *while*
 * rewriting, so it reports the tell-leakage numbers and names which feature to
 * fix rather than just refusing the deck.
 *
 *   node tools/content-pipeline/bin/report.mjs --deck pop-voices
 */

import { loadDeck, loadFigures, shippableCards, splitByAuthenticity } from "../lib/deck.mjs";
import { validateAll } from "../lib/validate.mjs";
import { deckTellReport, LOO_BLOCK_LIMIT, LOO_WARN_LIMIT } from "../lib/tells.mjs";

function parseArgs(argv) {
  const args = { deck: "pop-voices" };
  for (let i = 2; i < argv.length; i += 1) if (argv[i] === "--deck") args.deck = argv[++i];
  return args;
}

const args = parseArgs(process.argv);
const { manifest, cards } = await loadDeck(args.deck);
const { byId } = await loadFigures();
const outcome = validateAll({ manifest, cards, figures: byId });

const shippable = shippableCards(cards, manifest);
const { authentic, fabricated } = splitByAuthenticity(shippable);
const statuses = new Map();
for (const card of cards) statuses.set(card.status, (statuses.get(card.status) ?? 0) + 1);

const out = [];
out.push(`# ${manifest.title} (${args.deck}) v${manifest.contentVersion}`);
out.push("");
out.push(`cards            ${cards.length} total, ${shippable.length} shippable`);
out.push(`status           ${[...statuses].map(([k, v]) => `${k}:${v}`).join("  ")}`);
out.push(`figures          ${new Set(cards.map((c) => c.figureId)).size} distinct`);
if (shippable.length > 0) {
  const ratio = authentic.length / shippable.length;
  out.push(`authentic share  ${(ratio * 100).toFixed(1)}%  (${authentic.length}A / ${fabricated.length}F)`);
}

const blocking = outcome.issues.filter((e) => e.level === "block");
const warnings = outcome.issues.filter((e) => e.level === "warn");
out.push(`issues           ${blocking.length} blocking, ${warnings.length} warnings`);
out.push("");

if (shippable.length >= 8) {
  const tells = deckTellReport(shippable);
  const band =
    tells.looAccuracy > LOO_BLOCK_LIMIT ? "BLOCK" : tells.looAccuracy > LOO_WARN_LIMIT ? "warn" : "ok";
  out.push("## Tell leakage");
  out.push("");
  out.push(`leave-one-out accuracy  ${(tells.looAccuracy * 100).toFixed(1)}%  [${band}]`);
  out.push("");
  out.push("most predictive single features:");
  for (const entry of tells.worstOffenders) {
    out.push(`  ${(entry.accuracy * 100).toFixed(1).padStart(5)}%  ${entry.name}`);
  }
  const markers = tells.features.filter((f) => f.classMarker);
  if (markers.length > 0) {
    out.push("");
    out.push("exclusive class markers (a rule that never misfires — fix these first):");
    for (const f of markers) {
      out.push(`  ${f.name}: ${f.authPresent} authentic / ${f.fabPresent} fabricated`);
    }
  }
  out.push("");
}

const byCode = new Map();
for (const entry of outcome.issues) {
  const list = byCode.get(entry.code) ?? [];
  list.push(entry);
  byCode.set(entry.code, list);
}
out.push("## Issues by rule");
out.push("");
for (const [code, list] of [...byCode].sort((a, b) => b[1].length - a[1].length)) {
  out.push(`${String(list.length).padStart(4)}  [${list[0].level}] ${code}`);
  out.push(`      ${list[0].message}`);
}

process.stdout.write(`${out.join("\n")}\n`);
