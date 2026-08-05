#!/usr/bin/env node
/**
 * Reads device playtest exports and prints the status changes they justify.
 *
 *   node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices
 *
 * Prints proposals; it does not apply them. Flipping a card's status is a
 * reviewed PR edit — the data says what a room did, not what should ship.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { CONTENT_ROOT, loadDeck } from "../lib/deck.mjs";
import { mergeExports, proposeTransitions, verdictFor } from "../lib/calibration.mjs";

function parseArgs(argv) {
  const args = { deck: "pop-voices", json: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--deck") args.deck = argv[++i];
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

const args = parseArgs(process.argv);
const playtestDir = path.join(CONTENT_ROOT, "playtest");
const files = (await readdir(playtestDir).catch(() => [])).filter((name) => name.endsWith(".json"));

if (files.length === 0) {
  process.stdout.write(
    `No exports in ${playtestDir}.\nExport from the app's Settings screen and drop the file there.\n`,
  );
  process.exit(0);
}

const payloads = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(path.join(playtestDir, name), "utf8"))),
);
const totals = mergeExports(payloads);
const { cards } = await loadDeck(args.deck);
const proposals = proposeTransitions(cards, totals);

// Card ids in the export that this deck does not contain. Dev fixtures are the
// benign case; the one that matters is data gathered against an older deck
// version, where a card was retired or re-issued. Silently dropping those would
// let an editor read "no changes justified" as "the deck is stable" when a
// chunk of the evidence never applied to it.
const known = new Set(cards.map((card) => card.id));
const unmatched = [...totals.keys()].filter((id) => !known.has(id));
const deckVersions = [...new Set(payloads.map((p) => p.deckVersion).filter(Boolean))];

if (args.json) {
  process.stdout.write(`${JSON.stringify({ files: files.length, proposals, unmatched, deckVersions }, null, 2)}\n`);
} else {
  const counts = new Map();
  for (const card of cards) {
    const entry = totals.get(card.id);
    const verdict = entry ? verdictFor(entry) : "no-data";
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
  }

  process.stdout.write(
    `${files.length} export(s), ${totals.size} card(s) with data, ` +
      `${totals.size - unmatched.length} matched this deck\n`,
  );
  if (deckVersions.length > 0) {
    process.stdout.write(`export deck version(s): ${deckVersions.join(", ")}\n`);
  }
  if (unmatched.length > 0) {
    process.stdout.write(
      `\n${unmatched.length} card id(s) in the export are not in '${args.deck}' and were ignored:\n`,
    );
    for (const id of unmatched.slice(0, 8)) process.stdout.write(`  ${id}\n`);
    if (unmatched.length > 8) process.stdout.write(`  …and ${unmatched.length - 8} more\n`);
    process.stdout.write(
      "  Expected for development fixtures. Otherwise check the export's deck version.\n",
    );
  }
  process.stdout.write("\n");
  process.stdout.write("verdicts:\n");
  for (const [verdict, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`  ${String(n).padStart(4)}  ${verdict}\n`);
  }

  if (proposals.length === 0) {
    process.stdout.write("\nNo status changes are justified by this data yet.\n");
  } else {
    process.stdout.write(`\nproposed changes (${proposals.length}) — apply by editing the card records:\n`);
    for (const p of proposals) {
      const rate = p.correctRate === null ? "—" : `${(p.correctRate * 100).toFixed(0)}%`;
      const ci = `[${p.interval[0].toFixed(2)}, ${p.interval[1].toFixed(2)}]`;
      process.stdout.write(
        `  ${p.from} → ${p.to}  ${p.cardId}  (${p.displayName})\n` +
          `      correct ${rate} ${ci}  n=${p.exposures} across ${p.groups} groups  laugh ${(p.laughShare * 100).toFixed(0)}%\n`,
      );
    }
  }
}
