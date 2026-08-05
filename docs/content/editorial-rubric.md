# Editorial rubric — finding cards that are funny *and* playable

**Status:** Normative content spec. Mechanically enforced by `tools/content-pipeline/`.
**Supersedes:** the difficulty prose in `gameplay-spec.md` §5 and the fabrication guidance in `content-operations.md` §3, both of which remain valid but are subordinate to this document.

---

## 0. Thesis

**A card is not a joke; a card is a wager.**

The unit of value is the moment a room commits to an answer and then finds out it was wrong. Everything below optimizes for the size of that moment, and treats *funny* as a delivery vehicle for it rather than the goal.

Three consequences drive every rule in this document:

1. **Humor is scored conditional on misdirection.** A card scoring 5 on Laugh and 2 on Surprise is worth less than a 3/5. The rubric encodes this as a multiplier, not an average.
2. **Every card must be defensible twice** — once to a lawyer (*did they really say it?*) and once to the room (*why would we have believed either way?*). The `explanation` rendered on `ReviewScreen` is where both get paid off.
3. **The deck is the unit of quality, not the card.** Forty individually-excellent cards where the fakes are all polished and the reals all messy is a worse product than forty mediocre cards with matched texture. Anti-tell discipline (§4) outranks per-card quality.

---

## 1. Discovery

### 1.0 The structural rule

**The lane that finds a candidate is almost never the lane that verifies it.** Conflating the two is the single biggest defect in `phase0-deck.candidates.json`, where 16 of 20 authentic cards are both discovered *and* cited from one BuzzFeed listicle.

Discovery is therefore two stages with a queue between them.

### 1.1 Stage 1 — Lead generation (finds candidates, proves nothing)

| Lane | Yields | Verification value | Notes |
|---|---|---|---|
| **L1. Published roundups** — "best celebrity tweets of the decade" listicles | High volume, pre-filtered for funny | **Zero** | Listicles routinely republish fabricated screenshots without checking. Treat strictly as a *search index*. |
| **L2. Fan wikis, stan archives, subreddit best-of threads** | Deep per-figure recall; era-specific deep cuts | **Zero** | **The richest lane.** Famous tweets are burned by recall; the deep cuts are where 40–70% correct-rates live. |
| **L3. Editor recall + the Voice Bank** | Idiosyncratic, high variance | Zero | See §1.1.1. |
| **L4. Cross-media retrospectives** — late-night segments, podcasts about Twitter, "worst tweets" specials | Medium | Low | Useful for era coverage. The segment may itself be using a fake. |

**Rule: nothing enters the card file from Stage 1 alone.** A lead is a `{figure, approximate wording, approximate date}` triple that goes into a queue.

#### 1.1.1 The Voice Bank

Each editor maintains a per-figure note in `tools/content-pipeline/content/figures.json` recording 5–10 characteristic surface habits: casing convention, terminal-punctuation rate, typical length, typo rate, recurring subjects, favored constructions, era of peak activity.

This is not documentation overhead. **It is the decoy-writing spec** (§3) and the input to texture-matching. A decoy written without its figure's Voice Bank entry is written against an imagined celebrity rather than a real one, and reads that way.

### 1.2 Stage 2 — Verification (proves it, finds nothing)

| Lane | Standard |
|---|---|
| **V1. Web-archive capture of the original status URL** | **Primary.** The highest standard reachable without the API. |
| **V2. Contemporaneous mainstream citation** — article dated within ~30 days of the claimed post, quoting exact wording | **Strong secondary.** The window is the point: a 2011 article quoting a 2011 tweet is a witness; a 2019 listicle quoting it is hearsay. |
| **V3. Primary non-post record** — official transcript, published book, press release, the figure's own site, official podcast, broadcast transcript | **Primary, and the most underused lane available.** Mandated at **≥25% of the authentic pool** — see §1.2.1. |
| **V4. Licensed datasets / quote-licensing vendors** | Primary where the license permits display. Record terms in `source.rightsStatus`. |
| **V5. Institutional archives** — Library of Congress, news-org embed pages, university media collections | Primary. Narrow but ironclad. |

#### 1.2.1 Why non-post records are mandatory, not optional

`content-operations.md` §4 lists "Classic Quotes" as an optional deck. Make it a mandatory **quarter of every authentic pool**, for three compounding reasons:

- It is the cheapest lane to defend legally and the highest-verifiability lane available.
- It unlocks figures who never tweeted, which is most of the interesting ones.
- **A spoken quote has completely different surface texture from a tweet.** That widens the authentic style distribution, which directly makes decoy texture-matching easier and the anti-tell properties in §4 easier to satisfy. The lane that looks like a legal concession is actually a game-design advantage.

### 1.3 The defensible standard — three tiers

- **Tier A — ships.** One primary record (V1/V3/V4/V5) **plus** one independent secondary citation.
- **Tier B — ships with second-editor sign-off.** Two **independent** secondary citations (V2) from distinct outlets, with matching date *and* matching exact wording.
- **Tier C — never ships as authentic.** One aggregator/listicle/wiki, or two citations that both derive from the same original.

### 1.3.1 Amendment (2026-08-05): captures outrank citations for *wording*

The original rule required two independent **secondary** citations. That assumed
outlets are reliable for exact wording. They are not.

Checked directly: BuzzFeed's transcription of a Larry King post renders it as a
clean one-liner, while the archived tweet carries `#itsmy2cents` on its own line
and a trailing ellipsis. The quotes that looked cleanest in the listicle were the
ones that had been edited most. Since §1.4 makes typos and casing *the card*, an
outlet is the worst available source for the string.

So the two jobs are now separated:

| Question | Evidence |
|---|---|
| Did this statement exist? | independent citations, or an archive capture |
| What exactly did it say? | **the archive capture only** |

**Two independent captures of the canonical URL, byte-compared, satisfy the
provenance bar** in place of two independent articles. A capture *is* the post;
an article is somebody's retelling of it. `wordingSource: "article"` is rejected
outright, and a single capture with no independent citation warns.

This is not a relaxation. It raises the bar on wording while allowing the deep
cuts the rubric asks for — posts obscure enough to be unburned by recall are, by
definition, posts nobody wrote an article about.

**Anti-laundering check.** Two citations count as one if either holds:

- their quoted wording is character-identical **and** the later one links the earlier;
- both trace to the same syndicating outlet or the same listicle author.

The editor records `earliestCitationDate` per citation and asserts `independentOf: [citationIds]`. The validator checks `citations.filter(c => c.independent).length >= 2`.

### 1.4 Wording integrity

**Exact character-level transcription. Typos, casing, and missing punctuation are never corrected.**

They are the authenticity texture, and correcting them is the single most common way an authentic card starts reading like a fake. A "cleaned up" real tweet has been converted into evidence against itself.

**Permitted normalizations**, each logged in the card's `normalizations[]` array:

- `trailing-url-stripped` — removing a link at the end
- `emoji-stripped` — only when decorative, never when load-bearing
- `hashtag-stripped` — permitted and *encouraged* (see D3)

**Banned normalizations:** fixing spelling, adding terminal punctuation, changing case, merging thread parts, trimming for length. A card that needs trimming is a card that fails D3 and should be cut instead.

### 1.5 Stage 3 — Playability triage

A verified authentic candidate is still not a card. It goes through the rubric in §2. **Expect roughly a 4:1 kill rate here** — most famously-funny tweets are famous, famous means recall, and recall means a unanimous round.

---

## 2. The rubric

Six dimensions, rated independently by two editors **before either sees the other's scores**. Divergence greater than 1 on any dimension triggers a discussion, not an average.

### D1 — Surprise / Misdirection · weight 30

*How wrong is the room's first instinct?*

| | Anchor |
|---|---|
| **1** | The answer is legible from the first clause. A famous quotable everyone has seen (recall, not reasoning), or a fabrication that announces itself with a joke shape no human types. Dead round. |
| **2** | Surface strongly favors the correct answer. A room that thinks for three seconds converges. Some hesitation, no reversal. |
| **3** | Surface is neutral. The room genuinely doesn't know — but there's no *pull* toward the wrong answer either. A coin flip, not a trap. |
| **4** | Surface actively favors the **wrong** answer. Most of the room leans one way for an articulable reason, then gets contradicted. The reveal produces an audible "no way." |
| **5** | Surface favors the wrong answer *and* the reason it's actually true or false is discoverable in hindsight. The room re-reads the card after the reveal and says "the typo — the typo was the tell." |

**Why the highest weight:** `RoundScreen` shows one statement and two buttons. There is no other source of drama. Misdirection is the only dimension whose absence cannot be compensated by any other dimension.

### D2 — Laugh, conditioned · weight 15

*Given the card already misdirects, how much does the room enjoy the words?* Rate humor **as a card** — laughter at the reveal plus laughter during the argument — not standalone comedic quality.

| | Anchor |
|---|---|
| **1** | Nothing to enjoy. Bland, or the joke is a reference nobody in the room shares. |
| **2** | Mild smile. Amusing premise, no landing. |
| **3** | Reliable chuckle. Someone repeats a phrase back. |
| **4** | The room laughs at the reveal, not just the card. The truth is funnier than the text. |
| **5** | The card enters the group's vocabulary — someone quotes it later in the session. |

**Why the lowest scored weight — the opinionated call.** In a first-draft deck, over-indexing on funny is the dominant failure mode. Funny text is what makes a card feel good to an editor reading it alone at a desk, and it is precisely what makes a fabricated card too well-constructed (§3) and an authentic card too famous (§7). Laughter in this game is overwhelmingly *downstream of surprise* — the room laughs at being fooled, not at the sentence. Weighting Laugh high pulls the deck straight toward the polished-fake / famous-real deck we already have.

**Conditioning mechanic:** `laughAdj = laugh × min(surprise, 4) / 4`. A Surprise-1 card keeps ~25% of its laugh credit. **A hilarious, obviously-real tweet cannot score its way into the deck.**

### D3 — Read-Aloud Fitness · weight 20

*Delivered by a friend, at volume, once, to a room, off a forehead, in a bar.*

| | Anchor |
|---|---|
| **1** | Unreadable as speech. Depends on an image or thread context; is a formatted list; the punchline is visual (capitalization, spacing); >200 chars. |
| **2** | Readable but degraded. Handles and hashtags force pronunciation decisions; quoted dialogue needs vocal characterization; the funny beat is not at the end. |
| **3** | Fine. One or two sentences, ≤140 chars, no ornaments, joke lands in the last third. |
| **4** | Good aloud. ≤100 chars, single breath, ends on the operative word, no proper nouns the reader might mispronounce. |
| **5** | Sounds better spoken than read. Short enough to re-read twice while the room argues — and the second reading is funnier. |

**Mechanical proxies** (validator-enforced; not a substitute for the rating): `length ≤ 180` hard · `≤140` for score ≥3 · no `#`, `@`, or newline · ≤1 pair of quotation marks · ≤2 sentences for score ≥4.

Both formats need this. Room Beacon has friends reading off the screen aloud to the holder; pass-and-play has the holder reading aloud to everyone.

### D4 — Voice Recognizability / Knowledge Accessibility · weight 15

*Does the room have a mental model to reason from?*

| | Anchor |
|---|---|
| **1** | No model. Either the figure is unknown to the target audience, or the figure is known but their *posting voice* is not. Pure coin flip, no argument possible. **Auto-reject.** |
| **2** | One person in a typical room knows. The card becomes "let's trust Dana," which is a different and worse game. |
| **3** | Most of the room knows the figure; the voice is inferable from general persona even without having read their feed. |
| **4** | Genuine voice model. Several people can articulate "she'd never say it like that" — and disagree with each other. |
| **5** | The voice is a shared cultural object. Multiple people can do an impression. Maximum argument surface. |

**Why not higher:** a deck of nothing but 5s is a deck of five figures. Deliberately carry a small number of 3s — they broaden figure variety and are where deep cuts live. Just never carry a 1.

### D5 — Argument Fuel · weight 20

*Does the card give the room something to say to each other?* Distinct from Surprise: a card can be a genuine 50/50 and still produce silence and a shrug.

| | Anchor |
|---|---|
| **1** | Nothing to say. "I dunno, sure?" |
| **2** | One person asserts, nobody contests, the holder complies. |
| **3** | Two positions with stated reasons. Brief exchange. |
| **4** | Two factions citing *different evidence* — one on voice ("she talks like that"), one on content ("she'd never care about that"). The holder is genuinely torn. |
| **5** | The argument outlives the card. The room is still relitigating it two cards later, or the reveal produces an accusation ("YOU said fake!"). |

**Why weight 20:** a card that resolves in five seconds wastes the round. Argument Fuel is what converts dead time into the actual party, and it is the dimension most responsible for rematch rate — the north-star metric in `analytics-plan.md`.

**Write toward these:** a mismatch between voice signal and content signal; a specific detail the room can litigate ("would she really be at a Home Depot?"); a plausible-but-checkable date implication; a claim where persona and era point opposite ways.

### D6 — Safety · weight 0 (pure gate)

| | Anchor |
|---|---|
| **1** | Violates a category ban outright: crime, hate, sexual conduct, medical or financial advice, election falsehood, minors, private individuals. **Reject, no appeal.** |
| **2** | A fabricated statement making a checkable factual claim about a named real third party, or about the figure's real relationships, health, finances, or legal situation. **Reject.** |
| **3** | Screenshot-travel risk: the fabrication is the kind of thing that would be believed and shared out of context. Or innuendo attributed to a named living person. **Reject or rewrite.** |
| **4** | Clean but touches a live brand or trademark, or carries a mild edge needing `sensitivity` above the deck's declared level. **Ships only with second-editor sign-off and correct `sensitivity`.** |
| **5** | Harmless. Fabrication concerns mundane private experience — laundry, groceries, weather, technology, self-deprecation — with no third-party subject and no factual claim about the world. |

**Why weight 0:** a weight implies a trade. There is no amount of funny that buys a safety point. Safety is a gate, and it is the only dimension where an editor's judgment can veto a 95-composite card.

### 2.1 Composite

```
laughAdj  = laugh × min(surprise, 4) / 4

composite = 30 × (surprise    / 5)
          + 15 × (laughAdj    / 5)
          + 20 × (readAloud   / 5)
          + 15 × (voiceAccess / 5)
          + 20 × (argumentFuel/ 5)        →  0–100
```

### 2.2 Hard-fail gates

Any one of these rejects the card regardless of composite.

| | Rule |
|---|---|
| G1 | `safety ≤ 3` |
| G2 | `readAloud ≤ 2` |
| G3 | **`surprise ≤ 2`** — the "hilarious but obviously real" killer |
| G4 | `voiceAccess == 1` |
| G5 | `statementText.length > 180` |
| G6 | contains `#`, `@`, or a newline |
| G7 | authentic and `sourceTier` is not A or B |
| G8 | authentic and independent citation count < 2 |
| G9 | fabricated and `explanation` duplicates another card's in the deck |
| G10 | `card.sensitivity` exceeds `deck.sensitivity` |
| G11 | fabricated and the statement names a real person other than the attributed figure |

### 2.3 Thresholds

| Composite | Disposition |
|---|---|
| **≥ 80** | **Anchor card.** Eligible for run slots 8–10. Cap at ~15% of the deck — more than that means the rubric is being scored generously. |
| **68–79** | **Shortlist → `provisional`.** Enters calibration (§5). |
| **55–67** | **Rewrite queue.** Fabricated cards are almost always a texture problem (§3) and fixable. Authentic cards usually aren't — you can't rewrite a real tweet — so park them in the lead pool for a different deck. |
| **< 55** | Kill. |

Additionally: **no dimension below 3, except Laugh, which may be 2.** A boring-but-perfectly-misdirecting card is legitimate. A funny-but-unreadable one is not.

---

## 3. Decoy craft

> **You are not writing a joke that sounds like a celebrity. You are forging an artifact.**
> A forger doesn't paint a better Vermeer. They match the craquelure.

The fabricated pool is where the deck lives or dies, because it is the only half you control.

### 3.1 The core paradox: the funniest possible fake is the worst fake

Real tweets are typed on a phone, in traffic, half-thinking, by someone who is not being paid to be funny at that moment. They ramble, trail off, bury the good part, and end on a shrug.

A decoy written by someone *trying to be funny* produces:

- a two-beat structure (setup / turn)
- a terminal button ("It was." / "I accept these terms.")
- no wasted words
- a punchline in the final clause

Every one of those is a forensic marker. A room learns to detect them by round 4 without ever being able to articulate why — they just start voting FAKE on anything that sounds composed, and they're right.

**The discipline: write the funny version, then damage it.** Deliberately spend 2–4 points of Laugh to buy 2 points of Surprise. Under the weights in §2.1, that trade is always correct — Surprise is worth double Laugh, and Laugh is conditioned on Surprise anyway.

### 3.2 The six craft moves

**M1 — Texture matching.** Before writing a decoy for figure F, build F's surface profile from F's *authentic pool* (the Voice Bank, §1.1.1): median length, case convention, terminal-punctuation rate, typo rate, sentence count, favored constructions. Write to that profile, not to "how a celebrity tweets" in the abstract. If F's authentic cards average 62 characters and never end in a period, a 130-character two-sentence decoy is a signed confession.

**M2 — Mundane specificity.** Real tweets contain load-bearing-nothing details: a place, a brand, a number, a time of day — none doing comedic work. *"at the hotel"*, *"the CVS on 9th"*, *"twice"*, *"on a Tuesday"*. Invented jokes strip these because they slow the joke down, which is exactly why their presence is evidence. **Minimum one pointless concrete detail per decoy.** It also feeds D5 directly: the room litigates the detail.

**M3 — Mid-thought openings.** Real posts often begin in the middle of a thought the reader wasn't on: *"anyway"*, *"ok but"*, *"update:"*, *"so apparently"*, *"i've decided"*. Constructed jokes begin at the beginning because they're built to stand alone. Open ~40% of decoys mid-thought.

**M4 — Kill the button.** After the punchline lands, add a flat non-funny trailing clause, or cut the last sentence so the joke ends one beat early. *"…and now the dog won't look at me. anyway what's everyone doing"* — the trailing clause is worth more than any tag you could write.

**M5 — Deliberate imperfection, rationed hard.** A typo, a missing apostrophe, a dropped word, an autocorrect artifact. **Maximum 25% of decoys, and only for figures whose authentic pool actually shows it.** If every fabricated card has a typo, the typo becomes the tell in reverse — which is worse, because it also poisons the genuinely typo-ridden authentic cards.

**M6 — Reaction, not performance.** Real feeds are mostly reactions to the world — replies, complaints, observations about something that just happened — rather than standalone bits. Frame decoys as responses to an unstated stimulus.

### 3.3 The "too well constructed" tell, in checkable form

Flag any decoy where **all four** hold:

1. exactly 2 sentences, and
2. the second is shorter than the first, and
3. it ends in a period, and
4. the final ≤5 words contain the funniest content.

That is the stand-up shape. It is present in at least 11 of the 20 fabricated cards currently in `phase0-deck.candidates.json`. Flagged cards are routed to M4, not auto-rejected.

### 3.4 Calibrating a decoy against the authentic pool

The right question is never *"is this fake good?"* but **"is this fake indistinguishable from the reals it will sit next to?"**

1. **Blind mix test.** Print the decoy alongside 6 authentic cards from the same deck, shuffled and unlabeled. Give it to an editor who didn't write it. Target: **≤40% identification** by a trained editor. A room will do worse, which is the point.
2. **Which-is-funnier test.** Rank the 7 by funniness. **If the decoy ranks 1st or 2nd, it is too good.** Target rank: 3rd–5th. This single test inverts every instinct an editor has, and it is the most useful check in this document.
3. **Feature-vector distance.** Any feature (§4.1) where the decoy sits outside the authentic pool's observed range is a rewrite note.
4. **Never a rewrite of a neighbour.** A decoy may be calibrated *against* the authentic pool's texture but must not be a variant of a specific authentic card shipping in the same deck. Enforced by `formatFingerprint` uniqueness (P5).

### 3.5 Worked examples

Generic archetypes, so the technique transfers rather than the specific line.

---

**Example 1 — The Wholesome Stoic Action Star** (soft-spoken, low output, universally liked)

> **Before:** "Someone held the elevator for me today. I whispered thank you like it was a secret mission. It was."

Textbook two-beat with a button. *"It was."* is a comedian's tag — nobody types that on a phone. Zero mundane specificity. Reads *written*. Surprise 2 → G3 fail.

> **After:** "someone held the elevator at the hotel today and i said thank you twice. i think about the second one more than i should"

Lowercase (M1, matching a low-key voice); *"at the hotel"* is a pointless concrete detail (M2); an "and" run-on instead of a clean break; the funny beat (*"twice"*) is buried mid-sentence rather than landing at the end (M4); the closer trails into self-consciousness instead of landing. **Less funny, far more believable. Laugh 4→3, Surprise 2→4, composite up ~9.**

---

**Example 2 — The Shouty Celebrity Chef**

> **Before:** "This avocado toast is so raw it just asked me for a safe word."

Safety 2 — innuendo attributed to a named living person in an `everyone` deck. Also strategically doomed: insult-chef tweets are the internet's most-forged genre, so the room's prior is already "fake," which kills Surprise. And it is a joke *about* the archetype rather than a thing the person would type.

> **After:** "Someone has sent me a photo of their 'homemade risotto'. It's rice. In a bowl. With cheese on."

Safe, and reacting to an inbound thing (M6) — which is what this figure's real feed actually is. Register-matched idiom. Fragment-stacking that reads as *typed while annoyed* rather than *written*. Critically, the button was cut: an earlier draft ended *"Well done."* Removing it costs a laugh and buys the card. **Safety 2→5, Surprise 2→4.**

---

**Example 3 — The Enigmatic Teen Philosopher** (Title Case aphorisms)

> **Before:** "Clouds Are Just Sky Thoughts That Got Tired And Sat Down."

The most instructive failure mode here: **the fake out-writes the authentic pool.** This is a genuinely elegant aphorism with meter and a clean image. The real ones are lumpier — they hedge, they add unnecessary qualifiers, they wobble. A fake that is *better literature* than the reals is a tell in reverse, and a room that has seen three real ones will feel the polish without naming it.

> **After:** "Clouds Are Just The Sky Getting Tired I Think Sometimes."

Added a hedge (*"I Think"*), added a dangling *"Sometimes"* that does nothing, broke the meter, removed the personification payoff. **A worse aphorism and a much better card.** The paradox in its purest form: the writing quality was deliberately degraded to raise the score.

---

**Example 4 — The Deadpan Pop Superstar with a Public Romantic History**

> **Before:** "Currently ranking my exes by how well they would survive a group project. The spreadsheet has colors."

Three failures. Safety 2 — a fabricated claim about real identifiable third parties, attached to the one narrative this archetype is most litigated over; highest screenshot-travel risk available. It is also the joke *the internet already makes about her*, so the room reasons from meme rather than voice and Argument Fuel collapses to "that's the bit people do." And it's a two-beat with a button.

> **After:** "the group chat has decided what my next album is called and i need everyone to know that it is not that"

No third parties, no factual claim, no punchline. Runs on a shared-experience premise grafted onto a celebrity-specific stake. Ends on *"not that"* — deliberately anticlimactic. It is *funny-adjacent* rather than funny, which is what real posts are. **Safety 2→5, Argument Fuel 2→4** — the room now argues about whether she'd be that self-aware, which is a voice argument, which is the game.

---

**Example 5 — The Wisecracking Franchise Lead** (banter brand, married to someone famous)

> **Before:** "Blake says if I make one more Deadpool joke at breakfast she's putting pineapple on my pizza as punishment. I accept these terms."

Names a real spouse (Safety 2). Leans on the exact franchise the room associates with him, which reads as *written by someone who googled him for ten seconds*. *"I accept these terms"* is a stock construction. And it is fact-checkable in a way that makes the argument about trivia rather than voice.

> **After:** "got recognised in a hardware store and the guy just said 'the movie guy', nodded, and walked off. anyway i bought the wrong screws"

No third parties. The recognition beat is the joke and it's over by the halfway mark; everything after is deflation (M4). *"anyway i bought the wrong screws"* is the whole technique in one clause — mundane specificity (M2), button killed (M4), and something for the room to litigate ("is he a hardware-store guy?"). Lowercase, no terminal punctuation, one comma splice. **Surprise 2→5** — the room's instinct becomes "too shaggy to be written for a game."

---

## 4. Anti-tell discipline

### 4.0 The property

> An observer who has seen every card in the deck, knows every answer, and can compute any function of the **surface text alone** must not predict authenticity better than the deck's base rate ± tolerance.

Equivalently: the authentic and fabricated sub-populations must be statistically indistinguishable on a fixed feature set.

### 4.1 The feature vector

| Feature | Type |
|---|---|
| `lenBucket` | `<40` / `40-79` / `80-139` / `140-180` |
| `endsWithTerminalPunct` | bool |
| `allLowercase` | bool |
| `hasAllCapsRun` (≥2 consecutive ALL-CAPS words) | bool |
| `sentenceCount` | 1 / 2 / 3+ |
| `hasNonstandardGrammar` (typo, dropped word, missing apostrophe) | bool, editor-flagged |
| `punchlineInFinal20Pct` | bool, editor-flagged |
| `opensMidThought` | bool, editor-flagged |
| `hasConcreteMundaneDetail` | bool, editor-flagged |
| `hasProperNounOtherThanFigure` | bool |
| `eraVocabTag` | pre-2015 / 2015-2019 / 2020+ |

The editor-flagged booleans are the ones that matter most and the ones no regex can get. They cost one checkbox each at draft time.

### 4.2 The checkable properties

Let `p_A(f)` and `p_F(f)` be the proportion of authentic / fabricated cards carrying feature `f`.

| | Property |
|---|---|
| **P1** | Deck-level parity: for every boolean feature, `|p_A(f) − p_F(f)| ≤ 0.15`. |
| **P2** | Bucketed parity: for `lenBucket`, `sentenceCount`, `eraVocabTag`, total-variation distance between the two distributions `≤ 0.20`. |
| **P3** | Run-level parity: within any generated 10-card run, `|p_A(f) − p_F(f)| ≤ 0.40`. Looser because n=10 — but it stops a run that is five polished fakes and five messy reals. |
| **P4** | **Cross-texture ballast:** ≥3 authentic cards flagged `readsFabricated` **and** ≥3 fabricated cards flagged `readsAuthentic`. This is the property that actively *breaks* meta-learning rather than merely not creating it — the room must be punished for pattern-matching on polish at least once per session. |
| **P5** | Every card carries a `formatFingerprint` from a controlled vocabulary (`dialogue-with-stranger`, `wanna-feel-old`, `band-name-pun`, `food-taxonomy-question`, `first-time-trying-X`, `age-arc-list`, `addressing-another-celebrity`, `self-deprecating-career-reference`, …). **No fingerprint may appear twice in a deck.** |
| **P6** | Any figure with ≥2 cards in the deck must have **at least one authentic and one fabricated**. A figure whose every card is fabricated is a free win once the room notices. |
| **P7** | Two cards sharing a `figureId` must not share a `formatFingerprint` and must not share ≥3 content words. Enforces "the decoy is not a rewrite of the real one." |
| **P8** | All `explanation` strings distinct; no fabricated explanation may be a substring of another. Each fabricated reveal must state *what specifically was invented and why it was plausible* — the reveal is a payoff screen, not a disclaimer. |
| **P9** | `0.45 ≤ authentic / total ≤ 0.55`. |
| **P10** | `max(card.sensitivity) ≤ deck.sensitivity`. |

All but P4 are computable from the JSON alone. P4 needs one editor boolean.

---

## 5. The calibration loop

### 5.1 Two tiers, deliberately separate

**Tier 1 — Editorial playtest (the promotion path).** A build writes per-card aggregates to local storage; an editor collects them manually from their own and recruited playtest devices. Human-carried data, not telemetry: no network, no consent problem, full control over audience composition. **Only Tier 1 data changes a card's `status`.**

**Tier 2 — On-device adaptation (the personalization path).** Each install accumulates its own card history and uses it to bias *selection* for that household. It never promotes or retires a card globally; it only decides what this device shows next.

### 5.2 What is captured per exposure

| Signal | Meaning |
|---|---|
| `correct` | the core metric |
| `skipped` | confusion or discomfort |
| `latencyMs` | proxy for deliberation |
| `roomSize` | audience context |
| `guessedAuthentic` | detects *directional* bias — a card everyone calls fake differs from a coin flip |
| `funniestPick` | one optional tap on `RecapScreen` ("which card got the biggest reaction?") — the laugh signal, without a microphone |
| `reported` | safety override |

**Derived:**

- `correctRate = correct / answered`
- `splitQuality = 1 − |2·correctRate − 1|` (1.0 at a perfect 50/50)
- `laughShare = funniestPicks / rounds containing the card` — baseline 0.10 in a 10-card run; above 0.20 is a genuinely beloved card
- **`deliberationIndex` = median latency ÷ deck median latency** — the most underrated signal here. High latency + ~50% correct is a *real argument*. Low latency + ~50% correct is a room *guessing*. These are indistinguishable by correct-rate alone and they are opposite in value.

### 5.3 Verdicts

**Use Wilson score intervals at 90%, never the raw proportion.** Every rule below is about where the *interval* sits, not the point estimate. This is the entire defence against retiring good cards on small samples: at n=12, 4/12 correct gives an interval of roughly [0.15, 0.61] — wide enough to trigger nothing, correctly.

**No status change of any kind before n ≥ 12 exposures across ≥4 distinct groups.**

| Transition | Condition |
|---|---|
| `provisional` → `confirmed` | n ≥ 25 across ≥8 groups **and** interval ⊂ [0.30, 0.80] **and** `skipRate < 0.10` |
| `provisional` → `watch` | n ≥ 12 and the interval lies **entirely** above 0.85 (too easy) or **entirely** below 0.25 (arbitrary / mis-keyed) |
| `watch` → rewrite queue | interval still outside [0.25, 0.85] at n ≥ 25. **Fabricated cards go to rewrite (§3), not the bin.** Authentic cards are re-triaged for a different deck or audience. |
| any → `retired` | interval outside [0.15, 0.90] at n ≥ 40 across ≥12 groups; **or** `skipRate > 0.20` at n ≥ 25; **or** any report of `wrong-attribution` / `harmful-content` — immediate, n=1, no statistics |
| `confirmed` → `watch` | correctRate drifts outside [0.25, 0.85] over a trailing 30-exposure window — catches cards going stale as a tweet becomes famous or a figure's standing shifts |

**Stated bluntly: a card is never retired on fewer than 25 exposures.** Three groups of college seniors who happen to follow the same figure will make a five-star card look broken. The `watch` state exists precisely so editors have somewhere to put suspicion that isn't the bin.

**Anti-contamination:** exposures where the card was skipped due to a control-input failure are excluded from `answered`.

### 5.4 Difficulty is a property of the audience, not the card

This is the most important idea in this section, and the flat `difficulty: 1-5` int in the current schema is a category error.

A 2014-era Cher tweet has no difficulty. It has difficulty *1* for anyone who followed her feed at the time and *coin flip* for a room of 22-year-olds. Storing one number destroys that information and produces a deck that feels wildly miscalibrated to half its audiences.

**Store difficulty as a vector over audience buckets:**

```json
"calibration": {
  "byAudienceBucket": {
    "pop-2000s": { "n": 31, "correct": 19 },
    "pop-2010s": { "n": 44, "correct": 27 },
    "pop-2020s": { "n": 22, "correct":  8 },
    "unknown":   { "n": 12, "correct":  7 }
  }
}
```

**How a room gets bucketed without collecting anything sensitive:** three **anchor cards** — `confirmed` cards with known, strongly bucket-differentiated correct-rates — are seeded into the first run of a session at slots 1, 3 and 6. The room's performance on those three classifies it for the remainder of the session. No questions, no PII, no setup friction, and it doubles as gameplay. The bucket is device-local, decays across sessions, and never leaves the device.

Consequences:

- Promotion to `confirmed` requires the interval condition to hold in **≥2 buckets**, or the card is confirmed **bucket-scoped** (`confirmed:pop-2010s`) and served only to those rooms.
- A card at 0.90 in one bucket and 0.45 in another **is not a bad card**. It is a correctly-bucketed card, and a great card for the second audience. The flat model would have retired it.
- Run composition (§6) targets correct-rates using the *current room's* bucket estimate, not a global average.
- A deck whose cards are all confirmed in one bucket is an incomplete deck — a coverage report the editor can run.

The schema field is therefore `difficultyPrior` (an editorial guess used only until data exists), never `difficulty`.

---

## 6. Deck and run composition

The deck is a pool; the run is the product. Every constraint below is testable against a generated run.

### 6.1 The 10-slot shape

Target correct-rates are against the current room's bucket.

| Slot | Target | Role |
|---|---|---|
| 1 | 0.70–0.85 | **Warm-up.** Short (<80 chars). Establishes the mechanic and buys an early win. |
| 2 | 0.70–0.85 | Warm-up, **opposite answer to slot 1**. One of these two must be a *fabricated* card the room gets right — which teaches "fakes exist and are findable" and prevents the everything-is-real default. |
| 3 | 0.45–0.60 | **First real 50/50.** Also an anchor card (§5.4). |
| 4 | 0.55–0.70 | Body. |
| 5 | 0.35–0.50 | **The humbling one** — early enough that the room recovers. |
| 6 | 0.55–0.70 | Body. Anchor card. |
| 7 | 0.45–0.60 | Body. |
| 8 | ≥ 0.45 | **The best card in the run** (highest `laughShare`). Energy peaks here; at slot 10 it would compete with end-of-round score anxiety. |
| 9 | 0.30–0.45 | **Hardest card.** The argument peak. Floor of 0.30 — never end the ramp on something that feels arbitrary. |
| 10 | 0.55–0.70, **authentic**, `surprise ≥ 4` | **The closer.** |

**Why slot 10 must be authentic — a firm opinion.** The last reveal is the emotional note the room carries into the rematch prompt. `ReviewScreen` renders "fabricated for this game" for a fake: a shrug. For an authentic card it renders a fact about the world. The session's final beat should be *"they actually posted that"*, not an admission that we made it up.

### 6.2 Answer-sequence constraints

- Exactly 5 authentic / 5 fabricated.
- **No run of 3 consecutive identical answers.** Rooms detect alternation and anti-alternation both; three in a row is where a room starts playing the sequence instead of the cards.
- Slots 1 and 2 differ. Slot 10 is authentic, so exactly 4 authentic among slots 1–9.
- The full 10-bit answer pattern must differ from the immediately previous run on this device. Rematch is the north-star metric, and a repeated pattern is the fastest way to poison it.
- No pattern may be palindromic or strictly alternating.

### 6.3 Variety constraints

- **No figure appears twice in a run.** Non-negotiable.
- All 10 `formatFingerprint` values distinct.
- ≥4 distinct categories; no category above 3 cards.
- ≥2 figures at `voiceAccess ≥ 4`; ≤3 figures at `voiceAccess == 3`.
- ≥3 figures absent from the immediately previous run.
- Run-level style parity per P3.
- ≥1 `readsFabricated` and ≥1 `readsAuthentic` card, non-adjacent — the meta-breakers.
- Length variety: at least one card <60 chars and one >120 chars, **on both sides of the authenticity split**.

### 6.4 Pool requirements

- **Minimum ~60 cards with ≥20 distinct figures** for a 10-card run under these constraints. Below that the solver produces near-identical runs. `content-operations.md` §5 targets 50–150 for Phase 0 — aim at the top of that band.
- ≥25% of authentic cards from the non-post lane (V3), per §1.2.1.
- ≥6 `confirmed` cards with strong bucket differentiation, so every run can seed 2–3 anchors.

---

## 7. Applying this to `phase0-deck.candidates.json`

A competent *research artifact* and a weak *deck*. The figures are well chosen, the safety instincts are mostly sound, the 20/20 ratio is correct. But it fails the §4 anti-tell property thoroughly enough that a room would break it in one session, and it fails the §1.3 provenance gate on 16 of 20 authentic cards.

Estimate: **~6 cards ship as-is, ~14 are rewritable, ~20 are structurally dead.**

### 7.1 Systemic defects, ranked

**S1 — The pairing structure is fatal.** Nearly every fabricated card is a same-figure companion to an authentic card, and most riff on the same joke: meatball→spaghetti, pickle→ketchup, cereal-first-time→popcorn-first-time, "Wu Tang Cher Clan"→"Fleetwood Cher Mac", "wanna feel old"→"wanna feel ancient". Violates P5, P6, P7 and the no-repeat-figure rule simultaneously. Within a run, seeing one makes the other free; across a session, the room learns "the second one is the fake" and stops arguing.

**S2 — Source monoculture.** 16 of 20 authentic cards cite the identical listicle URL. Under §1.3 that is Tier C: **none of them ship.** This isn't pedantry — listicles are a primary vector for laundering fabricated screenshots into "fact," and one dead URL takes 40% of the deck with it. The Ryan Reynolds card (`b1…0003`, Wayback capture) is the only Tier-A card in the file and is the template for the other 19.

**S3 — Style-distribution mismatch, textbook.** The authentic pool contains lowercase, missing punctuation and typos ("is meatball an fruit", "Why is rhode island **nor** a road", "kowabunga dudettes"). The fabricated pool is almost uniformly sentence-cased, terminally punctuated, grammatical, and shaped setup→turn→button; at least 11 of 20 match the §3.3 stand-up shape.

Measured by `tools/content-pipeline/lib/tells.mjs` (figures verified against the file, not estimated):

| | authentic | fabricated | |
|---|---|---|---|
| `exclCount` | 3 cards | **0** | exclusive class marker |
| `curlyTypographyCount` | 3 cards | **0** | exclusive class marker |
| `startsLowercase` | 7 | 3 | d = 0.46 |
| `endsWithTerminalPunct` | 11 | 15 | d = −0.42 |

Leave-one-out accuracy over the full feature vector is **0.60** (warn band; p = 0.13, so not significant at n=40). The whole-vector leak is therefore modest — but **the two exclusive markers are the real defect**, and they block. A feature present in several cards of one class and *none* of the other is a rule that never misfires for the player who notices it, however unimpressive its effect size looks. Curly quotes are the worst of these because they are not a voice trait at all: they are a copy-paste signature from the source article, i.e. the deck leaking its own production process.

A disjunctive style-only rule combining those markers with the length extremes (`<20` or `>140` chars) fires on **13 of 40 cards and is correct on 11 — 85% precision, with no knowledge of the figure at all.**

**S4 — Anachronistic decoy vocabulary.** "gaslighting", "gatekeeping", "work-life balance" are 2020s joke-Twitter register dropped onto figures whose authentic cards are from 2010–2014. An `eraVocabTag` mismatch is a free tell (P2 fail).

**S5 — Twenty identical reveals.** Every fabricated card's `explanation` is the same eleven words. `ReviewScreen` renders `explanation` as the payoff line under the truth badge, so **half the deck's payoff moments are boilerplate**, and the deck's most-repeated string is a non-joke. P8 fail, twenty times over.

**S6 — Recall, not reasoning.** The Oscars selfie caption, "just setting up my twttr", and the Tony Hawk TSA bit are three of the most-circulated tweets in history. The room either remembers them (unanimous, dead round) or has never heard of them (coin flip). Neither is the game. **Fame is negatively correlated with card quality** — L2 in §1.1 exists to reach past it.

**S7 — Unmanaged knowledge gating.** Several figures require a voice model the stated target audience largely lacks. The Cher pair in particular is a pure coin flip with zero argument fuel — nothing in "Wu Tang Cher Clan" vs "Fleetwood Cher Mac" is arguable if you haven't read the feed. It will produce a ~50% correct-rate that looks perfect on a dashboard and is completely hollow. This is exactly what `deliberationIndex` (§5.2) exists to catch.

**S8 — Five fabricated-only figures.** P6 fail. Combined with S1, an attentive room can infer: paired figure → the odd one out is fake; unpaired figure → probably fake.

**S9 — Read-aloud failures.** The Oscars card contains `#oscars` (G6) and its joke depends on a photo the game never shows (readAloud 1). The Tony Hawk age-arc card is ~250 chars (G5), is a formatted list, and its punchline is a callback to its own first line. A Dionne Warwick card contains an `@handle` (G6).

**S10 — Safety defects.** The Gordon Ramsay card carries sexual innuendo attributed to a named living person and ships `sensitivity: "teen"` inside a deck declared `sensitivity: "everyone"` — a P10/G10 violation live in the file today. The Taylor Swift card makes a fabricated claim about real identifiable third parties on the topic with maximum screenshot-travel risk. Both reject.

**S11 — Difficulty is fiction.** All 40 values are asserted, never measured, and stored as a scalar (§5.4). Several are plainly wrong.

**S12 — No run-composition layer.** The file is ordered 20 authentic then 20 fabricated. A naive "take 10" produces **ten authentic cards in a row.**

### 7.2 Cards that score well

| Card | Read |
|---|---|
| **"is meatball an fruit"** | **Best in the file.** 20 chars, perfect aloud, genuinely absurd, and the argument is real ("he's exactly that guy" vs "that's *too* perfect"). Needs a Tier-A citation and its spaghetti sibling removed. |
| **Cereal-with-milk** | Mundane specificity, no punchline, lowercase, short. Reads written-for-a-game and isn't. |
| **"Why is rhode island nor a road or an island"** | The typo does all the work; the editorial note is right to preserve it. Textbook `readsFabricated` ballast (P4). |
| **USB cable** | Well-constructed enough to read fake, and it's real. Exactly the cross-texture card the deck needs. Its fitted-sheet decoy sibling must go. |
| **"kowabunga dudettes"** | Long, weird, era-locked, unguessable from persona. Genuine split. |
| **Coupons / SALE RACK** | The ALL-CAPS burst is strong authenticity texture and it reads well aloud. |
| **"who is gatekeeping this"** | Best-written fake in the file on texture grounds. Two fixes: the anachronism (S4) and the sibling pairing (S1). Re-figure it and it ships. |

### 7.3 Dead rounds

Oscars selfie (image-dependent + hashtag + universal recall) · "just setting up my twttr" (no voice model of the figure exists in a party room) · both Tony Hawk cards (recall; and 250 chars of formatted list) · the Cher pair (coin flip, zero argument fuel, fingerprint collision) · the Jaden Smith pair (the fake out-writes the real one; Title-Case joke is visual and dies aloud) · the Dionne Warwick pair (structural clones, `@handle`, severe knowledge gating) · the Macaulay Culkin pair (same fingerprint, same figure, adjacent in the file — the purest example of S1) · Gordon Ramsay and Taylor Swift (S10) · Keanu Reeves (the editorial note concedes the answer is derivable from platform trivia rather than voice — a knowledge test wearing a card's clothes).

A painful one: the Britney global-warming/Gaga non-sequitur is *structurally perfect* — no punchline, hard turn, genuine non-sequitur, exactly what §3 tells you to write. But it is one of the most circulated tweets in history. Hold it for a deep-cuts deck, or accept it as a slot-1 warm-up with a measured 0.80+ correct-rate.

### 7.4 The single highest-leverage fix

**Break every same-figure authentic/fabricated pair.** Re-attribute half the decoys to figures with no authentic card in the deck, and re-format the other half so no two cards share a `formatFingerprint`. That one pass fixes S1, most of S8, and half of S3 — and converts the file from "a room solves this in one session" to "a room has to actually play."
