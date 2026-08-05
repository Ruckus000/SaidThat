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
 * The build refuses to run on a deck that fails validation. Emitting an
 * unvalidated bundle would move the gate from "content cannot ship" to "content
 * ships and we hope someone reads the report".
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDeck, loadFigures, shippableCards } from "../lib/deck.mjs";
import { validateAll } from "../lib/validate.mjs";
import { buildBundle, renderBundleModule, sourceChecksum } from "../lib/emit.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const OUTPUT = path.join(REPO_ROOT, "apps/mobile/src/content/deck.generated.js");

function parseArgs(argv) {
  const args = { deck: "pop-voices", check: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--deck") args.deck = argv[++i];
    else if (argv[i] === "--check") args.check = true;
  }
  return args;
}

const args = parseArgs(process.argv);
const { manifest, cards } = await loadDeck(args.deck);
const { byId } = await loadFigures();

const outcome = validateAll({ manifest, cards, figures: byId });
if (!outcome.ok) {
  const blocking = outcome.issues.filter((entry) => entry.level === "block");
  process.stderr.write(
    `Refusing to build '${args.deck}': ${blocking.length} blocking issue(s).\n` +
      `Run: node tools/content-pipeline/bin/report.mjs --deck ${args.deck}\n`,
  );
  process.exit(1);
}

const shippable = shippableCards(cards, manifest);
const bundle = buildBundle({ manifest, cards: shippable });
const rendered = renderBundleModule(bundle, sourceChecksum({ manifest, cards: shippable }));

if (args.check) {
  const existing = await readFile(OUTPUT, "utf8").catch(() => null);
  if (existing !== rendered) {
    process.stderr.write(
      "deck.generated.js is out of date with the editorial records.\n" +
        `Run: node tools/content-pipeline/bin/build.mjs --deck ${args.deck}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`deck.generated.js is current (${bundle.cards.length} cards).\n`);
} else {
  await writeFile(OUTPUT, rendered);
  process.stdout.write(`Wrote ${bundle.cards.length} cards to apps/mobile/src/content/deck.generated.js\n`);
}
