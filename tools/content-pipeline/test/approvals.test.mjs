import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { OWNER_APPROVAL, distinctApprovers, validateEditorialCard } from "../lib/schema.mjs";
import { toRuntimeCard } from "../lib/emit.mjs";
import { blockingIssues } from "../lib/issues.mjs";

const GAME = fileURLToPath(new URL("../../../apps/mobile/src/domain/game.js", import.meta.url));
const FIGURE = "c2000000-0000-4000-8000-000000000001";
const figures = new Map([[FIGURE, { figureId: FIGURE, displayName: "F", likenessAllowed: true }]]);

function card(approvals) {
  return {
    id: "b1000000-0000-4000-8000-000000000001",
    figureId: FIGURE,
    displayName: "F",
    statementText: "an ordinary statement for testing purposes",
    authenticity: "fabricated",
    category: "music",
    difficultyPrior: 3,
    sensitivity: "everyone",
    explanation: "Made up for the game.",
    formatFingerprint: "aphorism",
    source: null,
    decoyMethod: "human",
    editorialApprovals: approvals,
    styleFlags: {},
    eraVocabTag: "2020+",
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    editorialNotes: "",
  };
}

function codes(approvals) {
  return blockingIssues(validateEditorialCard(card(approvals), { figures })).map((i) => i.code);
}

test("approvals: the owner marker is identical in the app and the pipeline", async () => {
  // Two copies exist because the app must not import build tooling. If they
  // drift, a card the pipeline emits as approved becomes unplayable at runtime
  // with no error anywhere — exactly the silent-content-loss shape as before.
  const source = await readFile(GAME, "utf8");
  assert.ok(
    source.includes(`export const OWNER_APPROVAL = ${JSON.stringify(OWNER_APPROVAL)};`),
    `game.js must declare OWNER_APPROVAL as ${OWNER_APPROVAL}`,
  );
});

test("approvals: two distinct approvers satisfy the rule", () => {
  assert.deepEqual(codes([{ editor: "ed-a", decision: "approve" }, { editor: "ed-b", decision: "approve" }]), []);
});

test("approvals: one named approver alone does not", () => {
  assert.ok(codes([{ editor: "ed-a", decision: "approve" }]).includes("editorial.two-person-rule"));
  assert.ok(codes([]).includes("editorial.two-person-rule"));
});

test("approvals: an explicit owner approval is accepted, and stays visible as a single approver", () => {
  const approvals = [{ editor: OWNER_APPROVAL, decision: "approve" }];
  assert.deepEqual(codes(approvals), []);
  // Not silent: a deck carried by one approver is a real gap in review.
  const res = validateEditorialCard(card(approvals), { figures });
  assert.ok(res.issues.some((i) => i.code === "editorial.single-approver" && i.level === "warn"));
});

test("approvals: the marker is a distinct value, not a name that could collide", () => {
  // A person called "owner" must not clear the bar by accident.
  assert.ok(codes([{ editor: "owner", decision: "approve" }]).includes("editorial.two-person-rule"));
  assert.ok(codes([{ editor: "Ruckus", decision: "approve" }]).includes("editorial.two-person-rule"));
});

test("approvals: a rejection never counts toward approval", () => {
  assert.deepEqual(distinctApprovers([{ editor: OWNER_APPROVAL, decision: "reject" }]), []);
  assert.ok(codes([{ editor: OWNER_APPROVAL, decision: "reject" }]).includes("editorial.two-person-rule"));
});

test("approvals: the marker survives into the emitted runtime card", () => {
  const runtime = toRuntimeCard(card([{ editor: OWNER_APPROVAL, decision: "approve" }]));
  assert.deepEqual(runtime.editorialApprovals, [OWNER_APPROVAL]);
});
