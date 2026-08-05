import assert from "node:assert/strict";
import test from "node:test";

import { otherProperNouns, safetyReport } from "../lib/safety.mjs";
import { blockingIssues } from "../lib/issues.mjs";

const manifest = { sensitivity: "everyone" };

function screen(overrides) {
  return safetyReport(
    {
      displayName: "Test Figure",
      authenticity: "fabricated",
      sensitivity: "everyone",
      statementText: "anyway the dog will not look at me",
      ...overrides,
    },
    { manifest },
  );
}

function codes(res) {
  return blockingIssues(res).map((entry) => entry.code);
}

test("safety: a harmless mundane fabrication passes", () => {
  assert.equal(screen({}).ok, true);
});

test("safety: sexual content blocks on either authenticity", () => {
  assert.ok(codes(screen({ statementText: "it just asked me for a safe word" })).includes("safety.sexual"));
  assert.ok(
    codes(screen({ authenticity: "authentic", statementText: "it just asked me for a safe word" }))
      .includes("safety.sexual"),
  );
});

test("safety: crime claims block only for fabricated cards", () => {
  const fabricated = screen({ statementText: "i shoplifted a whole cake today" });
  assert.ok(codes(fabricated).includes("safety.crime"));
  // An authentic quote mentioning a crime is a fact about the world; a
  // fabricated one is us putting the words in someone's mouth.
  const authentic = screen({ authenticity: "authentic", statementText: "i shoplifted a whole cake today" });
  assert.ok(!codes(authentic).includes("safety.crime"));
});

test("safety: election falsehoods and minors block", () => {
  assert.ok(codes(screen({ statementText: "the election was rigged and everyone knows" })).includes("safety.election-falsehood"));
  assert.ok(codes(screen({ statementText: "my 6-year-old said the funniest thing" })).includes("safety.minors"));
});

test("safety: medical and financial assertions block for fabrications", () => {
  assert.ok(codes(screen({ statementText: "turmeric cures cancer, tell everyone" })).includes("safety.medical-financial-advice"));
  assert.ok(codes(screen({ statementText: "guaranteed returns if you act today" })).includes("safety.medical-financial-advice"));
});

test("safety: a fabrication naming a multi-word third party blocks (G11)", () => {
  const res = screen({ statementText: "the uber driver told me to check out Tony Hawk" });
  assert.ok(codes(res).includes("safety.third-party-named"));
});

test("safety: a mid-sentence capitalised name blocks; a sentence-initial one warns", () => {
  // Mid-sentence capitalisation does not occur in ordinary prose, so it is a name.
  assert.ok(codes(screen({ statementText: "i think Blake was right about breakfast" })).includes("safety.third-party-named"));

  // Sentence-initial is genuinely ambiguous — "Blake says" and "Tried to" look
  // identical to a pattern matcher — so the editor confirms rather than CI guessing.
  const initial = screen({ statementText: "Blake says i make too many jokes at breakfast" });
  assert.equal(initial.ok, true);
  assert.ok(initial.issues.some((entry) => entry.code === "safety.possible-third-party"));
});

test("safety: the attributed figure's own name is not a third party", () => {
  assert.deepEqual(otherProperNouns("Test Figure went to the shop", "Test Figure").certain, []);
  assert.deepEqual(otherProperNouns("i saw Home Depot was closed", "Test Figure").certain, ["Home Depot"]);
});

test("safety: hyphenated words are one token, not two fake names", () => {
  const { certain, possible } = otherProperNouns("does anyone else think Wi-Fi is just ghosts", "F");
  assert.deepEqual(certain, ["Wi-Fi"]);
  assert.deepEqual(possible, []);
});

test("safety: Title Case statements skip name extraction and warn instead", () => {
  const text = "Clouds Are Just The Sky Getting Tired I Think Sometimes";
  const found = otherProperNouns(text, "F");
  assert.equal(found.titleCase, true);
  assert.deepEqual(found.certain, []);
  const res = screen({ statementText: text });
  assert.equal(res.ok, true);
  assert.ok(res.issues.some((entry) => entry.code === "safety.title-case-unscanned"));
});

test("safety: ordinary sentence openers are not treated as names", () => {
  for (const text of ["Tried to return a jacket without a receipt", "Someone held the elevator today"]) {
    const { certain, possible } = otherProperNouns(text, "F");
    assert.deepEqual(certain, [], text);
    assert.ok(possible.length <= 1, text);
  }
});

test("safety: a fabricated checkable claim blocks for screenshot-travel risk", () => {
  assert.ok(codes(screen({ statementText: "i am quitting the band after ten years" })).includes("safety.checkable-claim"));
});

test("safety: card sensitivity above the deck's blocks (G10)", () => {
  const res = screen({ sensitivity: "teen", statementText: "a perfectly ordinary sentence" });
  assert.ok(codes(res).includes("safety.sensitivity-containment"));
});

test("safety: elevated sensitivity inside a permissive deck warns only", () => {
  const res = safetyReport(
    { displayName: "F", authenticity: "fabricated", sensitivity: "teen", statementText: "ordinary sentence" },
    { manifest: { sensitivity: "mature" } },
  );
  assert.equal(res.ok, true);
  assert.ok(res.issues.some((entry) => entry.code === "safety.elevated-sensitivity"));
});
