# Product Brief — Did They Tweet That?

**Status:** Planning complete. A scoped local-first Expo MVP is in progress under `apps/mobile/` (owner implementation exception). This brief is strategy context, not a claim that the app is release-ready.  
**Date:** 2026-07-18  
**Classification:** Internal product strategy (not legal advice)

---

## 1. Executive summary

**What it is:** A fast, social party game where a group sees a statement attributed to a public figure and decides whether that person really posted or said it. The primary MVP experience is a Heads Up–style local mode: one player holds the phone outward (or on their forehead), friends shout guidance, and tilt/tap records the answer.

**Who it is for:** Friend groups and party-game players who want laughter in under 30 seconds of explanation—especially college-age and young-adult pop-culture fans.

**Why it could work:** The binary judgment (“really / not really”) is instantly understandable; social-media voice is a recognizable cultural skill; forehead/pass-and-play formats already proved durable in Heads Up! / Charades!; adjacent web quizzes (especially Trump tweet real/fake) show demand for the *mechanic*, even if none owns a polished multi-celebrity party product.

**Why it might fail:** Content rights and platform dependence are unusually hard; fake attributions create defamation and store-policy risk; replay value collapses without continuous high-quality decks; motion controls often feel unreliable; the name ties the brand to X/Twitter trademarks and one content type.

**Strongest differentiator:** Not “another trivia app”—it is *social proof of cultural literacy* delivered as a physical party ritual (phone facing out, timed chaos, shareable review moments), with a content system that can expand beyond any single platform.

**Largest unresolved risk:** Legally and operationally safe content supply at party-game quality, without depending on the X API or fabricating harmful statements about living people.

**Recommendation:** **Conditional go.** Fund a Phase 0 validation prototype (one mode, one deck, 50–150 curated cards, no accounts) and legal counsel review of content patterns *before* investing in multiplayer, monetization, or X integration. Do **not** ship under “Did They Tweet That?” as the permanent master brand without trademark counsel.

---

## 2. Target audience

| Segment | Fit for MVP | Notes |
|---|---|---|
| Party-game players | **Primary** | Already understand Heads Up / Jackbox rituals |
| College students / friend groups | **Primary launch channel** | High density social occasions |
| Pop-culture fans | Strong secondary | Deck themes (music, film, sports) |
| News/politics followers | Later, gated | High engagement, high controversy risk |
| Social-media-heavy users | Secondary | Understand voice/style jokes |
| Content creators | Post-MVP partners | Branded decks, not core users |

**Primary MVP audience:** 18–28 friend groups seeking low-friction party games for living rooms, dorms, and bars (phone-on-forehead / pass-and-play).

---

## 3. Jobs to be done

1. **Help my group start laughing quickly** — zero rules lecture.
2. **Give us a game that works with one phone** — no account wall.
3. **Test whether I recognize how a celebrity “sounds” online.**
4. **Create surprising, shareable moments** (“Wait, they ACTUALLY said that?”).
5. **Fill 5–15 minutes between other activities** without setup pain.

Non-goals for MVP: becoming a news literacy product, a UGC platform, or a daily-solo habit loop.

---

## 4. Product positioning

| Option | Verdict |
|---|---|
| Party game first | **Recommended** |
| Solo trivia first | Reject for MVP — loses social magic |
| UGC platform first | Reject — moderation/legal explosion |
| News/media literacy tool | Optional later framing, not launch brand |

**Working master brand (recommendation):** Launch under a platform-neutral name (examples for trademark search: *Said That?*, *Really Posted?*, *Cite Check Party*, *They Said What?*). Use **“Did They Tweet That?”** as a *deck or mode name* only after trademark review—or retire it if counsel flags risk.

Positioning statement (draft):  
*The party game where your friends decide if the celebrity really said it—fast, loud, and one phone.*

---

## 5. Format recommendation (A / B / C)

| Format | MVP? | Rationale |
|---|---|---|
| **A — Heads Up–style local** | **Yes — primary** | Highest social energy; clearest differentiator vs web quizzes |
| **B — Pass-and-play** | **Yes — secondary in MVP** | Accessibility, smaller groups, scoring without forehead play |
| **C — Multiplayer rooms** | **No — Phase 3** | Latency, accounts, abuse, infra cost before fun is proven |

---

## 6. Mode recommendation

| Mode | MVP? | Challenge to “Real or Fake” |
|---|---|---|
| **1. Real or Fake** | **Yes** | Simplest cognitive load; best for forehead readability |
| 2. Who Posted It? | Phase 2 | Strong variety, but more UI chrome and spoiler risk |
| 3. Bluff Mode | Phase 2+ | Closer to Psych!; higher content cost |
| 4. AI or Real | Later | Store deception policies; labeling burden |
| 5. Which Went Viral? | Later | Needs engagement metrics/licensing |
| 6. Chronological Order | Later | Slow for party pace |
| 7. Custom Decks | Phase 3, private only | UGC moderation requirements |

**Challenge result:** Real or Fake remains the correct MVP *if* fabrications are clearly labeled as game content after reveal and never presented as news. If counsel blocks fabrications about living people, pivot MVP to **licensed quotes / public speeches / “Who Said It?”** with multiple-choice public figures only.

---

## 7. Core gameplay loop

1. Open app → Home  
2. Pick **Party (forehead)** or **Pass-and-play**  
3. Select deck → optional player names (pass-and-play)  
4. Pre-round instructions + 3-2-1 countdown  
5. Active card: statement + attribution; timer running  
6. Answer via tilt or tap → next card  
7. Round ends → results (correct / wrong / skip / score)  
8. Card review with **Verified / Fabricated for game** label + source link when allowed  
9. Rematch / change deck / share results image  
10. Optional: report card → return home  

---

## 8. MVP scope

### Must-have
- Format A + tap/no-motion accessibility mode  
- Format B basic scoring (local players)  
- One primary mode: Real or Fake  
- 3–5 curated decks, offline-ready after download  
- Round timer, score, card review with authenticity label  
- In-app content report  
- Analytics + crash reporting  
- Explicit fabrication labeling on reveal  

### Should-have (still MVP if capacity)
- Deck browser with difficulty/sensitivity badges  
- Shareable results card  
- Haptics + audio cues  
- Remote config for kill-switches on decks/cards  

### Later
- Accounts, streaks, daily deck, IAP packs  
- Room-code multiplayer  
- Who Posted It / Bluff / AI modes  
- Creator decks, public custom decks  

### Do not build yet
- Live X API hydration in the game client  
- Profile photos / likeness-heavy UI  
- AI-generated celebrity impersonation as default decoys  
- Public UGC decks  
- Political “breaking news” decks at launch  
- Ads in the middle of rounds  

---

## 9. Retention (MVP-appropriate only)

Prove rematch rate first. Allowed in Phase 1:
- Rematch CTA  
- Small rotating deck catalog (editorial)  
- Share results  

Defer: streaks, push notifications, seasons, leaderboards, UGC.

**North-star for validation:** rematch rate after a completed round among groups of 3+.

---

## 10. Monetization

| Model | Fit |
|---|---|
| No monetization in Phase 0–1 validation | **Recommended** |
| Free + paid deck packs | Phase 2 default |
| One-time premium unlock | Alternative Phase 2 |
| Subscription | Only if content cadence is proven |
| Ads | Avoid during timed party rounds |
| Sponsored decks | Phase 2+ with disclosure |
| Paid app upfront | Possible but hurts sampling |

---

## 11. Success criteria to continue building

Phase 0 exit (paper/prototype playtests, n≥10 groups):
- ≥70% of groups complete ≥2 rounds without facilitator help  
- Qualitative “would play again at a party” ≥8/10 median  
- Motion or tap controls rated usable by ≥80%  

Phase 1 exit:
- Rematch rate ≥40% of completed rounds  
- Crash-free sessions ≥99.5%  
- Content reports actionable within SLA; no store policy flags  

---

## 12. Go / no-go (product view)

**Go to Phase 0** with platform-neutral branding direction and editorial content (no X dependency).  
**No-go on production launch** until counsel reviews fabrication + publicity patterns and trademark on the product name.
