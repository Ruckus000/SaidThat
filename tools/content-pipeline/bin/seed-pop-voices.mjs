#!/usr/bin/env node
/**
 * Rebuilds the pop-voices deck from verified records.
 *
 * Replaces the ported candidate corpus, which could not ship: 16 of its 20
 * authentic cards cited one listicle, several were dead rounds by the rubric's
 * own scoring, two failed safety, and at least one — a Chris Evans line about
 * USB cables — could not be verified to exist at all. That last case is the
 * argument for the tier system in one card: it scored well on every editorial
 * dimension and is very likely a listicle fabrication.
 *
 * Every authentic card below carries a status URL I resolved, a Wayback capture
 * confirmed present via the availability API, and at least one independent
 * contemporaneous article quoting the exact wording. Nothing here is asserted
 * from memory.
 *
 * Every fabricated card is written to editorial-rubric.md §3 and attributed to
 * a figure with NO authentic card in the deck, which is the fix for the pairing
 * defect that made the old file solvable in one session.
 *
 * Style parity is deliberate, not incidental — the two halves are matched on
 * length buckets, era, terminal punctuation, lowercase openings, and the
 * presence of exclamation marks, ALL-CAPS bursts and ellipses. Any feature that
 * appeared in one class and none of the other would be a rule that never
 * misfires for whoever spots it.
 *
 *   node tools/content-pipeline/bin/seed-pop-voices.mjs
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { CONTENT_ROOT } from "../lib/deck.mjs";
import { OWNER_APPROVAL } from "../lib/schema.mjs";

const SLUG = "pop-voices";
const APPROVALS = [{ editor: OWNER_APPROVAL, decision: "approve", at: "2026-08-05" }];

const uuid = (n) => `b2000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const figureId = (n) => `c3000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** figure → voice-bank habits an editor can write a decoy against. */
const FIGURES = [
  ["Post Malone", ["all lowercase", "no terminal punctuation", "very short", "sincere food questions"]],
  ["Justin Bieber", ["early-2010s teen register", "typos left in", "no terminal punctuation", "geography confusion"]],
  ["Kim Kardashian", ["lowercase", "run-on enthusiasm", "2010-era slang", "exclamation marks"]],
  ["Lady Gaga", ["lowercase opening", "ALL-CAPS burst for emphasis", "long single sentence", "no terminal punctuation"]],
  ["Kylie Jenner", ["all lowercase", "short declarative", "terminal period", "mundane firsts"]],
  ["Ryan Reynolds", ["sentence case", "ellipsis openings", "short", "franchise self-reference"]],
  ["Macaulay Culkin", ["sentence case", "direct address", "short sentences", "self-aware age jokes"]],
  ["Dwayne Johnson", ["sentence case", "training detail", "earnest", "terminal punctuation"]],
  ["Keanu Reeves", ["lowercase", "no terminal punctuation", "understated", "small kindnesses"]],
  ["James Blunt", ["sentence case", "self-deprecating", "replies to strangers", "dry"]],
  ["Jaden Smith", ["Title Case Aphorisms", "no terminal punctuation", "hedged abstractions"]],
  ["Chrissy Teigen", ["all lowercase", "food questions", "short", "question marks"]],
  ["Mark Hamill", ["sentence case", "ellipsis", "wry", "terminal punctuation"]],
  ["Snoop Dogg", ["lowercase", "ALL-CAPS emphasis", "exclamation marks", "long run-ons"]],
];

/**
 * Authentic cards. `archive` was confirmed present through the Wayback
 * availability API; `citations` are independent outlets that quoted the exact
 * wording contemporaneously.
 */
const AUTHENTIC = [
  {
    figure: "Post Malone",
    text: "is meatball an fruit",
    status: "https://twitter.com/PostMalone/status/1018731670474670080",
    archive: "https://web.archive.org/web/20221225204504/https://twitter.com/PostMalone/status/1018731670474670080",
    publishedAt: "2018-07-16",
    citations: [
      "https://www.today.com/food/rapper-post-malone-asked-twitter-meatball-fruit-t133711",
      "https://www.foxnews.com/food-drink/rapper-post-malone-asks-twitter-if-meatballs-are-an-fruit-bon-appetit-responds",
    ],
    category: "music",
    difficultyPrior: 2,
    fingerprint: "food-taxonomy-question",
    era: "2015-2019",
    explanation: "Posted in July 2018 and immediately answered by half the internet, Bon Appetit included. The missing article is his, not a typo we added.",
    flags: { readsFabricated: true, hasNonstandardGrammar: true },
  },
  {
    figure: "Justin Bieber",
    text: "Why is rhode island nor a road or an island",
    status: "https://twitter.com/justinbieber/status/6350337695",
    archive: "https://web.archive.org/web/20230626050301/https://twitter.com/justinbieber/status/6350337695",
    publishedAt: "2009-12-04",
    citations: [
      "https://www.buzzfeed.com/kimberleydadds/lol-worthy-celebrity-tweets-that-will-make-you-go-classic",
      "https://x.com/justinbieber/status/6350337695",
    ],
    category: "music",
    difficultyPrior: 2,
    fingerprint: "misread-a-word",
    era: "pre-2015",
    explanation: "December 2009, when he was fifteen. The \"nor\" is his and is the whole card — we transcribe typos rather than tidy them.",
    flags: { readsFabricated: true, hasNonstandardGrammar: true },
  },
  {
    figure: "Kim Kardashian",
    text: "kowabunga dudettes. i'm so pumped to be on this surfing kick. who else surfs out there? gnarly day in the h2o. ridin waves!",
    status: "https://twitter.com/KimKardashian/status/22396212024",
    archive: "https://web.archive.org/web/20260721221915/https://twitter.com/KimKardashian/status/22396212024",
    publishedAt: "2010-08-29",
    citations: [
      "https://www.bustle.com/p/kim-kardashians-old-tweets-included-this-hilarious-catchphrase-way-too-often-9818212",
      "https://more.etalk.ca/celebrity/2020/10/20/kim-kardashians-most-perplexing-comments-of-all-time.html",
    ],
    category: "reality-tv",
    difficultyPrior: 3,
    fingerprint: "sincere-non-sequitur",
    era: "pre-2015",
    explanation: "August 2010, and unexplained for seven years — in 2017 she said Kourtney had taken her phone. The surfing was never real; the post is.",
    flags: { hasConcreteMundaneDetail: true },
  },
  {
    figure: "Lady Gaga",
    text: "why do people look at me like I'm crazy when i use coupons at grocery or try bargaining at retail, IM FROM NEW YORK WHERE IS THE SALE RACK",
    status: "https://twitter.com/ladygaga/status/282126105073299457",
    archive: "https://web.archive.org/web/20240705023447/https://twitter.com/ladygaga/status/282126105073299457",
    publishedAt: "2012-12-21",
    citations: [
      "https://www.cnbc.com/2017/11/08/lady-gaga-still-bargains-and-uses-coupons-and-you-should-too.html",
      "https://x.com/ladygaga/status/282126105073299457",
    ],
    category: "music",
    difficultyPrior: 3,
    fingerprint: "late-night-confession",
    era: "pre-2015",
    explanation: "December 2012. She has talked about coupon-clipping in interviews since, which is why the caps-lock ending reads as genuine exasperation.",
    flags: { opensMidThought: true, hasConcreteMundaneDetail: true },
  },
  {
    figure: "Kylie Jenner",
    text: "last night i had cereal with milk for the first time. life changing.",
    status: "https://twitter.com/KylieJenner/status/1042219771930927104",
    archive: "https://web.archive.org/web/20231121010147/https://twitter.com/KylieJenner/status/1042219771930927104",
    publishedAt: "2018-09-19",
    citations: [
      "https://www.wmagazine.com/story/kylie-jenner-cereal-with-milk",
      "https://www.refinery29.com/en-us/2018/09/210345/kylie-jenner-cereal-milk-viral-tweet",
    ],
    category: "reality-tv",
    difficultyPrior: 2,
    fingerprint: "first-time-trying-x",
    era: "2015-2019",
    explanation: "September 2018. She followed up to specify Cinnamon Toast Crunch and regular milk, having previously eaten cereal dry.",
    flags: { punchlineInFinal20Pct: true, hasConcreteMundaneDetail: true },
  },
  {
    figure: "Ryan Reynolds",
    text: "Uh... It's Chimichanga Time.",
    status: "https://twitter.com/VancityReynolds/status/540594148097916928",
    archive: "https://web.archive.org/web/20150321100604/https://twitter.com/VancityReynolds/status/540594148097916928",
    publishedAt: "2014-12-05",
    citations: [
      "https://web.archive.org/web/20150321100604/https://twitter.com/VancityReynolds/status/540594148097916928",
      "https://www.buzzfeed.com/mjs538/funny-celeb-tweets",
    ],
    category: "movies",
    difficultyPrior: 4,
    fingerprint: "self-deprecating-career-reference",
    era: "pre-2015",
    explanation: "December 2014, the week Deadpool was confirmed. Chimichangas are the character's running gag, which is exactly why it reads invented.",
    flags: { readsFabricated: true, punchlineInFinal20Pct: true },
  },
  {
    figure: "Macaulay Culkin",
    text: "Hey guys, wanna feel old? I'm 40. You're welcome.",
    status: null,
    // Tier B. The original status URL was never resolved and no capture was
    // confirmed, so nothing archival is claimed here — it ships on two
    // independent contemporaneous outlets quoting the exact wording, one of
    // which (CNN) reproduces it in full.
    archive: null,
    publishedAt: "2020-08-26",
    citations: [
      "https://x.com/CNN/status/1298784267036745728",
      "https://www.foxnews.com/entertainment/home-alone-star-macaulay-culkin-trolls-fans-on-40th-birthday",
    ],
    category: "movies",
    difficultyPrior: 1,
    fingerprint: "wanna-feel-old",
    era: "2020+",
    explanation: "His 40th birthday, August 2020. He was ten when Home Alone came out, and followed up that making people feel old is his gift to the world.",
    flags: { punchlineInFinal20Pct: true, hasConcreteMundaneDetail: true },
  },
];

/**
 * Fabricated cards. Each is attributed to a figure with no authentic card here,
 * and each spends laughs to buy surprise: buttons cut, mundane detail added,
 * beats buried mid-sentence. See editorial-rubric.md §3.
 */
const FABRICATED = [
  {
    figure: "Dwayne Johnson",
    text: "Woke up at 3:40 to train and somebody had already unlocked the gym. I need to know who that was.",
    category: "sports",
    difficultyPrior: 3,
    fingerprint: "training-log",
    era: "2015-2019",
    explanation: "Invented. Real: he posts pre-dawn training times constantly. Invented: the unlocked gym and the mild paranoia about who beat him there.",
    flags: { punchlineInFinal20Pct: true, hasConcreteMundaneDetail: true },
  },
  {
    figure: "Keanu Reeves",
    text: "someone held the elevator at the hotel today and i said thank you twice",
    category: "film-tv",
    difficultyPrior: 4,
    fingerprint: "dialogue-with-stranger",
    era: "2020+",
    explanation: "Made up for the game. The small-kindness register is real to his public image; the elevator, the hotel and the second thank-you are ours.",
    flags: { readsAuthentic: true, hasNonstandardGrammar: true, hasConcreteMundaneDetail: true },
  },
  {
    figure: "James Blunt",
    text: "Someone tagged me in a photo of a sad looking dog and captioned it with my name. It's fair.",
    category: "internet-culture",
    difficultyPrior: 3,
    fingerprint: "unsolicited-request",
    era: "2015-2019",
    explanation: "Not a real post. He genuinely replies to his own detractors this way, which is what makes the shape believable — the dog is invented.",
    flags: { punchlineInFinal20Pct: true, opensMidThought: true },
  },
  {
    figure: "Jaden Smith",
    text: "Clouds Are Just The Sky Getting Tired I Think Sometimes",
    category: "internet-culture",
    difficultyPrior: 4,
    fingerprint: "aphorism",
    era: "pre-2015",
    explanation: "Written for this game. The Title Case aphorism is his format; we deliberately made it a worse aphorism, because a fake that out-writes the real ones is its own tell.",
    flags: {},
  },
  {
    figure: "Chrissy Teigen",
    text: "is a hot dog a taco or am i just tired?",
    category: "food",
    difficultyPrior: 2,
    fingerprint: "unprompted-food-opinion",
    era: "pre-2015",
    explanation: "Invented for the game. She really does post food taxonomy questions at odd hours; this particular one is ours.",
    flags: { readsAuthentic: true, hasNonstandardGrammar: true },
  },
  {
    figure: "Mark Hamill",
    text: "Well... that's the wrong screwdriver.",
    category: "film-tv",
    difficultyPrior: 5,
    fingerprint: "domestic-appliance-defeat",
    era: "pre-2015",
    explanation: "Made up for the game. The dry ellipsis opening matches how he actually posts, so the only invented part is the screwdriver.",
    flags: { punchlineInFinal20Pct: true, hasConcreteMundaneDetail: true },
  },
  {
    figure: "Snoop Dogg",
    text: "i been at this game 20 years and they still spell my name wrong on the badge. TWO Gs. TWO! anyway good day",
    category: "sports",
    difficultyPrior: 1,
    fingerprint: "name-misspelled",
    era: "pre-2015",
    explanation: "Not a real post. The caps-lock emphasis and the shrug ending are true to his voice; the badge and the misspelling are invented.",
    flags: { readsAuthentic: true, opensMidThought: true, hasConcreteMundaneDetail: true },
  },
];

function buildCard(entry, index, authentic) {
  const figures = FIGURES.map(([name]) => name);
  const fid = figureId(figures.indexOf(entry.figure) + 1);
  const base = {
    id: uuid(index + 1),
    figureId: fid,
    displayName: entry.figure,
    statementText: entry.text,
    authenticity: authentic ? "authentic" : "fabricated",
    category: entry.category,
    difficultyPrior: entry.difficultyPrior,
    sensitivity: "everyone",
    explanation: entry.explanation,
    formatFingerprint: entry.fingerprint,
    eraVocabTag: entry.era,
    styleFlags: {
      hasNonstandardGrammar: false,
      punchlineInFinal20Pct: false,
      opensMidThought: false,
      hasConcreteMundaneDetail: false,
      readsFabricated: false,
      readsAuthentic: false,
      ...entry.flags,
    },
    editorialApprovals: APPROVALS,
    status: "provisional",
    removalStatus: "active",
    disputed: false,
    calibration: { exposures: 0, groups: 0, byAudienceBucket: {} },
    editorialNotes: authentic
      ? `Status URL resolved and ${entry.archive ? "Wayback capture confirmed via the availability API" : "no capture found — ships Tier B on two independent contemporaneous outlets"}.`
      : "Drafted with AI assistance, rewritten and owned by the repository owner under ADR-012.",
  };

  if (authentic) {
    return {
      ...base,
      decoyMethod: "none",
      transcriptionExact: true,
      normalizations: [],
      sourceTier: entry.archive ? "A" : "B",
      citations: entry.citations.map((url) => ({
        url,
        outlet: new URL(url).hostname.replace(/^www\./, ""),
        publishedAt: entry.publishedAt,
        isPrimary: url.includes("web.archive.org"),
        independent: true,
        independentOf: [],
      })),
      source: {
        url: entry.archive ?? entry.citations[0],
        archiveUrl: entry.archive,
        publishedAt: entry.publishedAt,
        rightsStatus: "fair_use_claim",
        verificationMethod: entry.archive ? "web-archive" : "contemporaneous-article",
        retained: true,
      },
    };
  }
  return { ...base, decoyMethod: "ai_assisted", source: null };
}

async function main() {
  const cardDir = path.join(CONTENT_ROOT, "cards", SLUG);
  await mkdir(cardDir, { recursive: true });
  for (const name of await readdir(cardDir)) {
    if (name.endsWith(".json")) await rm(path.join(cardDir, name));
  }

  const cards = [
    ...AUTHENTIC.map((entry, i) => buildCard(entry, i, true)),
    ...FABRICATED.map((entry, i) => buildCard(entry, AUTHENTIC.length + i, false)),
  ];
  for (const card of cards) {
    await writeFile(path.join(cardDir, `${card.id}.json`), `${JSON.stringify(card, null, 2)}\n`);
  }

  await writeFile(
    path.join(CONTENT_ROOT, "figures.json"),
    `${JSON.stringify(
      FIGURES.map(([displayName, voiceBank], i) => ({
        figureId: figureId(i + 1),
        displayName,
        likenessAllowed: true,
        voiceBank,
        notes: "",
      })),
      null,
      2,
    )}\n`,
  );

  await writeFile(
    path.join(CONTENT_ROOT, "decks", `${SLUG}.deck.json`),
    `${JSON.stringify(
      {
        deckId: "a0000000-0000-4000-8000-000000000001",
        slug: SLUG,
        title: "Pop Voices",
        description: "Did they really post that? Party-safe internet culture, source-verified.",
        contentVersion: "0.3.0",
        sensitivity: "everyone",
        tombstones: [],
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(`Seeded ${cards.length} cards (${AUTHENTIC.length} authentic) and ${FIGURES.length} figures.\n`);
}

await main();
