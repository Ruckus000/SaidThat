#!/usr/bin/env node
/**
 * Gate runner. Exits 1 if any blocking issue survives.
 *
 *   node tools/content-pipeline/bin/validate.mjs --deck pop-voices [--json]
 */

import { loadDeck, loadFigures } from "../lib/deck.mjs";
import { validateAll } from "../lib/validate.mjs";

function parseArgs(argv) {
  const args = { deck: "pop-voices", json: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--deck") args.deck = argv[++i];
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

const args = parseArgs(process.argv);
const { manifest, cards } = await loadDeck(args.deck);
const { byId } = await loadFigures();
const outcome = validateAll({ manifest, cards, figures: byId });

if (args.json) {
  process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
} else {
  const blocking = outcome.issues.filter((entry) => entry.level === "block");
  const warnings = outcome.issues.filter((entry) => entry.level === "warn");
  const byCode = new Map();
  for (const entry of blocking) byCode.set(entry.code, (byCode.get(entry.code) ?? 0) + 1);

  process.stdout.write(`deck '${args.deck}': ${cards.length} cards, ${blocking.length} blocking, ${warnings.length} warnings\n`);
  if (byCode.size > 0) {
    process.stdout.write("\nblocking by rule:\n");
    for (const [code, n] of [...byCode].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${String(n).padStart(4)}  ${code}\n`);
    }
    process.stdout.write("\nfirst 15:\n");
    for (const entry of blocking.slice(0, 15)) {
      process.stdout.write(`  ${entry.path}\n    ${entry.code}: ${entry.message}\n`);
    }
  }
}

process.exit(outcome.ok ? 0 : 1);
