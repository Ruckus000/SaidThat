#!/usr/bin/env node
/**
 * Independently re-checks every archive claim in a candidate file.
 *
 *   node tools/content-pipeline/bin/verify-candidates.mjs <candidates.json>
 *
 * Why this exists: a claimed Wayback URL is unfalsifiable by inspection. It
 * looks exactly like a real one, and a fabricated timestamp reads as plausible
 * to a reviewer. I produced one myself in an earlier batch, so no archive URL
 * enters the corpus on anybody's word — including mine.
 *
 * This asks the Wayback availability API directly and compares what comes back
 * against what was claimed. It is deliberately a separate step from validation:
 * the gates in lib/ are offline and deterministic, this needs the network.
 *
 * Exit code is 1 if any claim is contradicted, so it can gate a content PR.
 *
 * Run it ALONE. The availability API rate-limits briskly and does not tolerate
 * concurrent load — during a parallel research session it returns 429 to
 * everything, and even backoff will not clear it while other work is querying.
 * A 429 is reported as a WARN rather than a missing archive on purpose: a
 * network limit must never be recorded as evidence that a real citation is
 * fabricated.
 */

import { readFile } from "node:fs/promises";

const AVAILABILITY = "https://archive.org/wayback/available?url=";
const MAX_LENGTH = 180;
const ORNAMENTS = /[#@]|https?:\/\/|www\.|\n/;

function statusPath(url) {
  // twitter.com/user/status/123 and x.com/user/status/123 are the same record;
  // the availability API is keyed on the path, so normalise the host away.
  const match = String(url ?? "").match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/i);
  return match ? `twitter.com/${match[1]}/status/${match[2]}` : null;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The availability API rate-limits briskly — four rapid calls is enough to earn
 * a 429. Throttled and retried with backoff, because a 429 must never be
 * mistaken for "no archive exists": that would turn a network hiccup into a
 * false accusation against a real citation.
 */
const THROTTLE_MS = 1500;
let lastCall = 0;

async function availability(url, attempt = 0) {
  const wait = Math.max(0, lastCall + THROTTLE_MS - Date.now());
  if (wait > 0) await delay(wait);
  lastCall = Date.now();

  const response = await fetch(`${AVAILABILITY}${encodeURIComponent(url)}`, {
    headers: { accept: "application/json" },
  });

  if (response.status === 429 && attempt < 4) {
    await delay(3000 * 2 ** attempt);
    return availability(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`availability API returned ${response.status}`);
  const body = await response.json();
  return body?.archived_snapshots?.closest ?? null;
}

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: verify-candidates.mjs <candidates.json>\n");
  process.exit(2);
}

const parsed = JSON.parse(await readFile(file, "utf8"));
const candidates = Array.isArray(parsed) ? parsed : (parsed.candidates ?? []);

let contradicted = 0;
let unverifiable = 0;
let confirmed = 0;
const usable = [];

for (const candidate of candidates) {
  const label = `${candidate.figure}: ${JSON.stringify(String(candidate.statementText ?? "").slice(0, 44))}`;
  const notes = [];

  // Cheap structural checks first — no point querying the network for a card
  // that cannot be read aloud anyway.
  const text = String(candidate.statementText ?? "");
  if (text.length === 0) notes.push("BLOCK empty statement");
  if (text.length > MAX_LENGTH) notes.push(`BLOCK ${text.length} chars exceeds ${MAX_LENGTH}`);
  if (ORNAMENTS.test(text)) notes.push("BLOCK contains a hashtag, handle, URL or line break");
  if (candidate.charCount != null && candidate.charCount !== text.length) {
    notes.push(`WARN reported charCount ${candidate.charCount} but measured ${text.length}`);
  }

  const independent = (candidate.citations ?? []).filter(Boolean);
  if (independent.length < 1) notes.push("BLOCK no citations");

  const claimed = candidate.archiveUrl ?? null;
  const target = statusPath(candidate.statusUrl) ?? candidate.sourceUrl ?? null;

  if (claimed && !/^https?:\/\/web\.archive\.org\/web\/\d{14}\//.test(claimed)) {
    notes.push("BLOCK archiveUrl is not a well-formed Wayback capture URL");
  }

  if (target) {
    try {
      const snapshot = await availability(target);
      if (!snapshot?.available) {
        if (claimed) notes.push("CONTRADICTED claims an archive, but the API reports none");
        else notes.push("no capture (consistent with the claim of none)");
      } else {
        const actual = snapshot.url.replace(/^http:/, "https:");
        if (!claimed) {
          notes.push(`WARN a capture exists but none was claimed: ${snapshot.timestamp}`);
        } else if (claimed.replace(/^http:/, "https:") !== actual) {
          // The API returns the CLOSEST capture, so a different-but-real
          // timestamp is possible. Report both rather than assuming bad faith.
          notes.push(`MISMATCH claimed ${candidate.archiveTimestamp ?? "?"} but closest is ${snapshot.timestamp}`);
        } else {
          notes.push(`confirmed capture ${snapshot.timestamp}`);
        }
      }
    } catch (error) {
      notes.push(`WARN could not reach the availability API: ${error.message}`);
    }
  } else if (claimed) {
    notes.push("CONTRADICTED claims an archive but gives no source URL to check it against");
  }

  const blocked = notes.some((n) => n.startsWith("BLOCK") || n.startsWith("CONTRADICTED"));
  if (blocked) contradicted += 1;
  else if (notes.some((n) => n.startsWith("MISMATCH") || n.startsWith("WARN"))) unverifiable += 1;
  else confirmed += 1;
  if (!blocked) usable.push(candidate);

  process.stdout.write(`${blocked ? "✗" : "•"} ${label}\n`);
  for (const note of notes) process.stdout.write(`    ${note}\n`);
}

process.stdout.write(
  `\n${candidates.length} candidates: ${confirmed} clean, ${unverifiable} need a look, ${contradicted} rejected\n`,
);
process.exit(contradicted > 0 ? 1 : 0);
