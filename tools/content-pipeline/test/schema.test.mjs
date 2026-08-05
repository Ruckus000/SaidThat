import assert from "node:assert/strict";
import test from "node:test";

import {
  distinctApprovers,
  independentCitationCount,
  validateEditorialCard,
  validateDeckManifest,
} from "../lib/schema.mjs";
import { blockingIssues } from "../lib/issues.mjs";

const FIGURE_ID = "c2000000-0000-4000-8000-000000000001";
const figures = new Map([[FIGURE_ID, { figureId: FIGURE_ID, displayName: "Test Figure", likenessAllowed: true }]]);

function baseCard(overrides = {}) {
  return {
    id: "b1000000-0000-4000-8000-000000000001",
    figureId: FIGURE_ID,
    displayName: "Test Figure",
    statementText: "anyway i bought the wrong screws at the hardware store",
    authenticity: "fabricated",
    category: "music",
    difficultyPrior: 3,
    sensitivity: "everyone",
    explanation: "Made up for the game — invented to sound like an offhand post.",
    formatFingerprint: "domestic-appliance-defeat",
    source: null,
    decoyMethod: "human",
    editorialApprovals: [{ editor: "ed-a", decision: "approve" }, { editor: "ed-b", decision: "approve" }],
    styleFlags: {},
    eraVocabTag: "2020+",
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    editorialNotes: "owned by ed-a",
    ...overrides,
  };
}

function codes(res) {
  return blockingIssues(res).map((entry) => entry.code);
}

test("schema: a well-formed fabricated card validates", () => {
  const res = validateEditorialCard(baseCard(), { figures });
  assert.equal(res.ok, true, JSON.stringify(res.issues));
});

test("schema: an authentic card without an https source is rejected", () => {
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Posted in 2014.",
      sourceTier: "A",
      transcriptionExact: true,
      citations: [
        { url: "https://a.example/1", independent: true },
        { url: "https://b.example/2", independent: true },
      ],
      source: {
        url: "http://insecure.example/post",
        retained: true,
        verificationMethod: "web-archive",
        rightsStatus: "fair_use_claim",
      },
    }),
    { figures },
  );
  assert.ok(codes(res).includes("schema.source-url"));
});

test("schema: an authentic card with an unretained source is rejected", () => {
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Posted in 2014.",
      sourceTier: "A",
      citations: [
        { url: "https://a.example/1", independent: true },
        { url: "https://b.example/2", independent: true },
      ],
      source: {
        url: "https://a.example/post",
        retained: false,
        verificationMethod: "web-archive",
        rightsStatus: "fair_use_claim",
      },
    }),
    { figures },
  );
  assert.ok(codes(res).includes("schema.source-not-retained"));
});

test("schema: a fabricated card carrying a source is rejected", () => {
  const res = validateEditorialCard(
    baseCard({ source: { url: "https://a.example/post", retained: true } }),
    { figures },
  );
  assert.ok(codes(res).includes("schema.fabricated-has-source"));
});

test("schema: Tier C provenance never ships as authentic", () => {
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Posted in 2014.",
      sourceTier: "C",
      citations: [{ url: "https://listicle.example/1", independent: false }],
      source: {
        url: "https://listicle.example/1",
        retained: true,
        verificationMethod: "contemporaneous-article",
        rightsStatus: "fair_use_claim",
      },
    }),
    { figures },
  );
  const found = codes(res);
  assert.ok(found.includes("provenance.tier-c"));
  assert.ok(found.includes("provenance.independent-citations"));
});

test("schema: a single approver does not satisfy the two-person rule", () => {
  const res = validateEditorialCard(
    baseCard({ editorialApprovals: [{ editor: "ed-a", decision: "approve" }] }),
    { figures },
  );
  assert.ok(codes(res).includes("editorial.two-person-rule"));
});

test("schema: a bare approver string counts as zero approvals, not five", () => {
  // Guards the same trap as hasTwoDistinctApprovals: new Set("alice") has size 5.
  assert.deepEqual(distinctApprovers("alice"), []);
  assert.deepEqual(distinctApprovers([{ editor: "a", decision: "approve" }, { editor: "a" }]), ["a"]);
  assert.deepEqual(distinctApprovers([{ editor: "a", decision: "reject" }]), []);
});

test("schema: draft cards are exempt from the two-person rule", () => {
  const res = validateEditorialCard(baseCard({ status: "draft", editorialApprovals: [] }), { figures });
  assert.ok(!codes(res).includes("editorial.two-person-rule"));
});

test("schema: an AI-assisted decoy must name its human owner", () => {
  const res = validateEditorialCard(
    baseCard({ decoyMethod: "ai_assisted", editorialNotes: "" }),
    { figures },
  );
  assert.ok(codes(res).includes("editorial.ai-assist-ownership"));
});

test("schema: a fabricated card must disclose the fabrication in its explanation", () => {
  const res = validateEditorialCard(baseCard({ explanation: "He posted this in 2019." }), { figures });
  assert.ok(codes(res).includes("editorial.fabrication-not-disclosed"));
});

test("schema: a flat difficulty scalar is rejected in favour of difficultyPrior", () => {
  const card = baseCard({ difficulty: 3 });
  const res = validateEditorialCard(card, { figures });
  assert.ok(codes(res).includes("schema.difficulty-renamed"));
});

test("schema: an unknown format fingerprint is rejected", () => {
  const res = validateEditorialCard(baseCard({ formatFingerprint: "freeform-vibes" }), { figures });
  assert.ok(codes(res).includes("schema.format-fingerprint"));
});

test("schema: an unresolvable figureId is rejected", () => {
  const res = validateEditorialCard(
    baseCard({ figureId: "c2000000-0000-4000-8000-000000000999" }),
    { figures },
  );
  assert.ok(codes(res).includes("schema.figure-unknown"));
});

test("schema: independent citation counting ignores dependent citations", () => {
  assert.equal(independentCitationCount([{ independent: true }, { independent: false }]), 1);
  assert.equal(independentCitationCount(null), 0);
});

test("schema: deck manifest requires semver and a sensitivity level", () => {
  const res = validateDeckManifest({
    deckId: "a0000000-0000-4000-8000-000000000001",
    slug: "pop-voices",
    title: "Pop Voices",
    contentVersion: "1.0",
    sensitivity: "everyone",
    tombstones: [],
  });
  assert.ok(codes(res).includes("schema.content-version"));
});
