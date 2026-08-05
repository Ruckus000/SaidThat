#!/usr/bin/env node
/**
 * Emits the runtime deck bundle into apps/mobile/src/content/deck.generated.js.
 *
 *   node tools/content-pipeline/bin/build.mjs --deck pop-voices
 *   node tools/content-pipeline/bin/build.mjs --deck pop-voices --check
 *
 * --check regenerates in memory and exits 1 on any difference, so a card edited
 * without rebuilding cannot reach main.
 *
 * A defective card is WITHHELD, not fatal. Every card is gated individually and
 * the ones that pass are emitted; the rest are listed with their reasons. One
 * hashtag is not a reason to ship an empty deck.
 *
 * The build still refuses when the emitted SET is unsound — nothing shippable,
 * a broken manifest, or a deck whose fabricated half is identifiable from
 * surface style alone. Those are properties of the whole deck, with no single
 * card to drop, so there is nothing to withhold instead.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDeck, loadFigures } from "../lib/deck.mjs";
import { buildability } from "../lib/validate.mjs";
import { buildBundle, renderBundleModule, sourceChecksum } from "../lib/emit.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const OUTPUT = path.join(REPO_ROOT, "apps/mobile/src/content/deck.generated.js");

function parseArgs(argv) {
  const args = { deck: "pop-voices", check: false, strict: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--deck") args.deck = argv[++i];
    else if (argv[i] === "--check") args.check = true;
    // Opt-in "everything must be clean" mode, for a release gate that wants no
    // withheld cards at all.
    else if (argv[i] === "--strict") args.strict = true;
  }
  return args;
}

const args = parseArgs(process.argv);
const { manifest, cards } = await loadDeck(args.deck);
const { byId } = await loadFigures();

const { ok, shippable, withheld, deckIssues, reason } = buildability({ manifest, cards, figures: byId });

// Always report what was dropped. A silent withhold would read as "the deck is
// fine" when a third of it is on the floor.
const blocked = withheld.filter((entry) => entry.reason === "blocked");
const byStatus = new Map();
for (const entry of withheld) {
  if (entry.reason === "blocked") continue;
  byStatus.set(entry.reason, (byStatus.get(entry.reason) ?? 0) + 1);
}

process.stderr.write(
  `deck '${args.deck}': ${shippable.length} shippable, ${withheld.length} withheld of ${cards.length}\n`,
);
if (blocked.length > 0) {
  const codes = new Map();
  for (const entry of blocked) {
    for (const issue of new Set(entry.issues.map((i) => i.code))) {
      codes.set(issue, (codes.get(issue) ?? 0) + 1);
    }
  }
  process.stderr.write(`  ${blocked.length} withheld on gate failures:\n`);
  for (const [code, n] of [...codes].sort((a, b) => b[1] - a[1])) {
    process.stderr.write(`    ${String(n).padStart(3)}  ${code}\n`);
  }
}
for (const [status, n] of byStatus) {
  process.stderr.write(`  ${String(n).padStart(5)}  withheld by editorial status (${status})\n`);
}

if (!ok) {
  if (reason === "no-shippable-cards") {
    process.stderr.write(
      `\nRefusing to build: no card clears both its own gates and its editorial status.\n` +
        `Run: node tools/content-pipeline/bin/report.mjs --deck ${args.deck}\n`,
    );
  } else {
    process.stderr.write(`\nRefusing to build: the emitted set is unsound (${reason}).\n`);
    for (const issue of deckIssues) {
      process.stderr.write(`  ${issue.code}: ${issue.message}\n`);
    }
  }
  process.exit(1);
}

if (args.strict && withheld.some((entry) => entry.reason === "blocked")) {
  process.stderr.write(`\n--strict: refusing to build with ${blocked.length} card(s) failing their gates.\n`);
  process.exit(1);
}

const bundle = buildBundle({ manifest, cards: shippable });
const rendered = renderBundleModule(bundle, sourceChecksum({ manifest, cards: shippable }));

if (args.check) {
  const existing = await readFile(OUTPUT, "utf8").catch(() => null);
  if (existing !== rendered) {
    process.stderr.write(
      "\ndeck.generated.js is out of date with the editorial records.\n" +
        `Run: node tools/content-pipeline/bin/build.mjs --deck ${args.deck}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`deck.generated.js is current (${bundle.cards.length} cards).\n`);
} else {
  await writeFile(OUTPUT, rendered);
  process.stdout.write(`Wrote ${bundle.cards.length} cards to apps/mobile/src/content/deck.generated.js\n`);
}
