import assert from "node:assert/strict";
import test from "node:test";

import { isUnpronounceable, readAloudReport, sentenceCount, trailingClauseRatio } from "../lib/readability.mjs";
import { blockingIssues } from "../lib/issues.mjs";

function codes(text) {
  return readAloudReport({ statementText: text }).issues.map((entry) => entry.code);
}

function blocked(text) {
  return blockingIssues(readAloudReport({ statementText: text })).map((entry) => entry.code);
}

test("read-aloud: a short clean card raises nothing", () => {
  const res = readAloudReport({ statementText: "is meatball an fruit" });
  assert.equal(res.ok, true);
  assert.deepEqual(res.issues.filter((i) => i.level === "block"), []);
});

test("read-aloud: hashtags, mentions, URLs and newlines block (G6)", () => {
  assert.ok(blocked("Best photo ever #oscars").includes("read-aloud.hashtag"));
  assert.ok(blocked("thanks @chancetherapper for everything").includes("read-aloud.mention"));
  assert.ok(blocked("read this https://example.com/post").includes("read-aloud.url"));
  assert.ok(blocked("line one\nline two").includes("read-aloud.newline"));
});

test("read-aloud: over 180 characters blocks (G5)", () => {
  const long = `${"a word ".repeat(40)}end`;
  assert.ok(long.length > 180);
  assert.ok(blocked(long).includes("read-aloud.too-long"));
});

test("read-aloud: a card between 140 and 180 warns but does not block", () => {
  const text = `${"word ".repeat(30)}tail`; // 154 chars
  assert.ok(text.length > 140 && text.length <= 180);
  const res = readAloudReport({ statementText: text });
  assert.equal(res.ok, true);
  assert.ok(res.issues.some((entry) => entry.code === "read-aloud.long"));
});

test("read-aloud: vowelless tokens are unpronounceable", () => {
  assert.equal(isUnpronounceable("twttr"), true);
  assert.equal(isUnpronounceable("meatball"), false);
  assert.equal(isUnpronounceable("2014"), false);
  assert.equal(isUnpronounceable("123456"), true);
  assert.ok(blocked("just setting up my twttr").includes("read-aloud.unpronounceable"));
});

test("read-aloud: image and thread dependence warn without blocking", () => {
  const image = readAloudReport({ statementText: "look at this, it is the best thing i have ever seen today" });
  assert.equal(image.ok, true);
  assert.ok(image.issues.some((entry) => entry.code === "read-aloud.image-dependent"));

  const thread = readAloudReport({ statementText: "and that is why the whole thing fell over 2/3" });
  assert.ok(thread.issues.some((entry) => entry.code === "read-aloud.thread-dependent"));
});

test("read-aloud: emoji and heavy quoted dialogue warn", () => {
  assert.ok(codes("i am so happy about this 🎉").includes("read-aloud.emoji"));
  assert.ok(
    codes('he said "who are you" and i said "nobody" and he said "ok"').includes("read-aloud.quoted-dialogue"),
  );
});

test("read-aloud: sentence counting and trailing-clause ratio", () => {
  assert.equal(sentenceCount("one. two. three."), 3);
  assert.equal(sentenceCount("no terminal punctuation"), 1);
  assert.ok(trailingClauseRatio("short, and then a very much longer trailing clause here") > 0.5);
  assert.equal(trailingClauseRatio("single clause"), 1);
});

test("read-aloud: more than four sentences warns", () => {
  assert.ok(codes("One. Two. Three. Four. Five.").includes("read-aloud.clause-count"));
});

test("read-aloud: an empty statement produces no issues (schema owns that)", () => {
  assert.deepEqual(readAloudReport({ statementText: "" }).issues, []);
});
