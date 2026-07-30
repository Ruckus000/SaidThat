import assert from "node:assert/strict";
import test from "node:test";

import { CONTRAST_PAIRS, contrastRatio } from "./palette.js";

test("theme: the contrast math matches known WCAG reference values", () => {
  assert.ok(Math.abs(contrastRatio("#FFFFFF", "#000000") - 21) < 0.05, "white on black is 21:1");
  assert.equal(contrastRatio("#123456", "#123456").toFixed(2), "1.00", "identical colors are 1:1");
  // order-independent
  assert.equal(
    contrastRatio("#CDF244", "#0B0E13").toFixed(2),
    contrastRatio("#0B0E13", "#CDF244").toFixed(2),
  );
});

test("theme: every documented pair meets its WCAG 2.2 AA target in both themes", () => {
  assert.ok(CONTRAST_PAIRS.length > 0, "there are pairs to check");
  const failures = [];
  for (const p of CONTRAST_PAIRS) {
    const ratio = contrastRatio(p.fg, p.bg);
    if (ratio + 1e-9 < p.min) {
      failures.push(`${p.theme} · ${p.label}: ${ratio.toFixed(2)}:1 < ${p.min}:1 (${p.fg} on ${p.bg})`);
    }
  }
  assert.equal(failures.length, 0, `contrast failures:\n${failures.join("\n")}`);
});
