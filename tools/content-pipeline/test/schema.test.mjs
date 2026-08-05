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
  assert.ok(found.includes("provenance.independent-records"));
});

// Amended 2026-08-05: outlets silently tidy wording, so two archive captures of
// the canonical URL are an accepted substitute for two independent articles.
// The card still has to be Tier A/B — this changes what EVIDENCE counts, not
// how much.
test("schema: two archive captures satisfy the provenance bar", () => {
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Posted in 2019.",
      sourceTier: "A",
      transcriptionExact: true,
      wordingSource: "archive",
      citations: [],
      source: {
        url: "https://web.archive.org/web/20190706164317/https://twitter.com/a/status/1",
        retained: true,
        verificationMethod: "archive-double-capture",
        rightsStatus: "fair_use_claim",
        captures: [{ timestamp: "20190706164317" }, { timestamp: "20190707193037" }],
      },
    }),
    { figures },
  );
  assert.deepEqual(codes(res), []);
});

test("schema: one capture plus one independent citation is the original Tier A bar", () => {
  const card = baseCard({
    authenticity: "authentic",
    decoyMethod: "none",
    explanation: "Posted in 2011.",
    sourceTier: "A",
    transcriptionExact: true,
    wordingSource: "archive",
    citations: [{ url: "https://a.example/1", independent: true }],
    source: {
      url: "https://web.archive.org/web/20210820054710/https://twitter.com/a/status/1",
      retained: true,
      verificationMethod: "web-archive",
      rightsStatus: "fair_use_claim",
      captures: [{ timestamp: "20210820054710" }],
    },
  });
  // Primary record + independent secondary. Records combine across kinds;
  // what the rule counts is independent evidence, not evidence of one type.
  const res = validateEditorialCard(card, { figures });
  assert.deepEqual(codes(res), []);
});

test("schema: a primary transcript plus its capture is two records", () => {
  // An official transcript is the awarding body's own account, not a retelling,
  // and its capture pins what that page said on a date — so a Nobel interview
  // or an Academy speech database entry can ship without press coverage, which
  // is exactly the material no outlet bothers to quote.
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Said during the 2024 Nobel telephone interview.",
      sourceTier: "A",
      transcriptionExact: true,
      wordingSource: "archive",
      citations: [],
      source: {
        url: "https://www.nobelprize.org/prizes/physics/2024/example/interview/",
        retained: true,
        verificationMethod: "official-transcript",
        rightsStatus: "fair_use_claim",
        captures: [{ timestamp: "20260730165922" }],
      },
    }),
    { figures },
  );
  assert.deepEqual(codes(res), []);
});

test("schema: a lone transcript with no capture is still short of the bar", () => {
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Said during an interview.",
      sourceTier: "A",
      transcriptionExact: true,
      wordingSource: "archive",
      citations: [],
      source: {
        url: "https://example.invalid/interview",
        retained: true,
        verificationMethod: "official-transcript",
        rightsStatus: "fair_use_claim",
        captures: [],
      },
    }),
    { figures },
  );
  assert.ok(codes(res).includes("provenance.independent-records"));
});

test("schema: wording taken from an article is rejected outright", () => {
  // BuzzFeed's transcription of a Larry King post dropped a hashtag, a line
  // break and a trailing ellipsis. The rubric treats typos as the card, so an
  // outlet is the worst available source for the exact string.
  const res = validateEditorialCard(
    baseCard({
      authenticity: "authentic",
      decoyMethod: "none",
      explanation: "Posted in 2019.",
      sourceTier: "A",
      transcriptionExact: true,
      wordingSource: "article",
      citations: [
        { url: "https://a.example/1", independent: true },
        { url: "https://b.example/2", independent: true },
      ],
      source: {
        url: "https://a.example/post",
        retained: true,
        verificationMethod: "web-archive",
        rightsStatus: "fair_use_claim",
      },
    }),
    { figures },
  );
  assert.ok(codes(res).includes("provenance.wording-from-article"));
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
  assert.equal(
    independentCitationCount([
      { url: "https://a.example/1", independent: true },
      { url: "https://b.example/2", independent: false },
    ]),
    1,
  );
  assert.equal(independentCitationCount(null), 0);
});

/**
 * A minimal authentic card whose provenance is otherwise sound, so each test
 * below isolates the one gate it is about.
 */
function authenticCard(overrides = {}) {
  return baseCard({
    authenticity: "authentic",
    decoyMethod: "none",
    explanation: "Posted in 2019.",
    sourceTier: "A",
    transcriptionExact: true,
    wordingSource: "archive",
    citations: [
      { url: "https://a.example/1", independent: true },
      { url: "https://b.example/2", independent: true },
    ],
    source: {
      url: "https://twitter.com/a/status/1",
      retained: true,
      verificationMethod: "contemporaneous-article",
      rightsStatus: "fair_use_claim",
      captures: [],
    },
    ...overrides,
  });
}

test("schema: the isolated authentic fixture is itself clean", () => {
  assert.deepEqual(codes(validateEditorialCard(authenticCard(), { figures })), []);
});

// The flag is a claim; the host is the evidence. Two citations to one outlet
// are one record however they are flagged, which is the likeliest way for the
// two-record bar to be cleared without two actual records existing.
test("schema: citations sharing an outlet count once, whatever the flag says", () => {
  assert.equal(
    independentCitationCount([
      { url: "https://www.today.com/food/one", independent: true },
      { url: "https://today.com/food/two", independent: true },
    ]),
    1,
  );
  // An origin you cannot name is not corroboration.
  assert.equal(independentCitationCount([{ independent: true }]), 0);
  assert.equal(independentCitationCount([{ url: "not a url", independent: true }]), 0);
});

test("schema: an independent citation without a usable URL is called out by name", () => {
  const res = validateEditorialCard(
    authenticCard({
      citations: [{ independent: true }, { url: "https://b.example/2", independent: true }],
    }),
    { figures },
  );
  assert.ok(codes(res).includes("provenance.citation-url"));
});

// The bar is two DISTINCT captures. Captures are written as `{ timestamp }`
// objects, and deduplicating the objects rather than the timestamps counted one
// capture pasted twice as two records.
test("schema: the same capture recorded twice is one record, not two", () => {
  const res = validateEditorialCard(
    authenticCard({
      citations: [],
      source: {
        url: "https://twitter.com/a/status/1",
        retained: true,
        verificationMethod: "archive-double-capture",
        rightsStatus: "fair_use_claim",
        captures: [{ timestamp: "20190706164317" }, { timestamp: "20190706164317" }],
      },
    }),
    { figures },
  );
  const found = codes(res);
  assert.ok(found.includes("provenance.independent-records"));
  assert.ok(found.includes("provenance.archive-method-without-capture"));
});

// A field named archiveUrl must hold an archive. Thirteen shipped cards had a
// live twitter.com permalink in it, because nothing read the field at all.
test("schema: archiveUrl must be a Wayback capture URL, not a canonical link", () => {
  const res = validateEditorialCard(
    authenticCard({ source: { ...authenticCard().source, archiveUrl: "https://twitter.com/a/status/1" } }),
    { figures },
  );
  assert.ok(codes(res).includes("provenance.archive-url-shape"));
});

test("schema: a well-formed Wayback archiveUrl passes", () => {
  for (const archiveUrl of [
    "https://web.archive.org/web/20190706164317/https://twitter.com/a/status/1",
    // The host is case-insensitive, as DNS is.
    "https://WEB.ARCHIVE.ORG/web/20190706164317/https://twitter.com/a/status/1",
    "http://web.archive.org/web/20190706164317/https://twitter.com/a/status/1",
  ]) {
    const res = validateEditorialCard(
      authenticCard({ source: { ...authenticCard().source, archiveUrl } }),
      { figures },
    );
    assert.deepEqual(codes(res), [], archiveUrl);
  }
});

// The method field names a kind of evidence. Six cards declared `web-archive`
// with an empty captures array — claiming a form of proof they did not hold.
test("schema: a verification method naming an archive needs the captures to match", () => {
  const web = validateEditorialCard(
    authenticCard({ source: { ...authenticCard().source, verificationMethod: "web-archive" } }),
    { figures },
  );
  assert.ok(codes(web).includes("provenance.archive-method-without-capture"));

  // One capture does not make a double capture.
  const double = validateEditorialCard(
    authenticCard({
      source: {
        ...authenticCard().source,
        verificationMethod: "archive-double-capture",
        captures: [{ timestamp: "20190706164317" }],
      },
    }),
    { figures },
  );
  assert.ok(codes(double).includes("provenance.archive-method-without-capture"));
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
