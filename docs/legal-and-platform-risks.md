# Legal and Platform-Policy Analysis

**Date:** 2026-07-18  
**Important:** This document identifies issues for **qualified counsel**. It is **not legal advice**, not a clearance opinion, and not a substitute for reviewing current X, Apple, Google, and rights-of-publicity counsel guidance.

---

## 1. Summary judgment (product team)

Building a commercial game that attributes real and fabricated statements to living public figures sits at the intersection of:

- Platform ToS / API contracts (if using X content)  
- Copyright in post text and media  
- Right of publicity / false endorsement  
- Defamation / false light  
- App Store deception and UGC rules  
- Trademark risk in the product name  

**Team recommendation:** MVP should **avoid live X API dependency**, **avoid profile photos**, **clearly label fabricated cards**, use **human-written safe decoys**, maintain **source records**, and get **counsel review** before public TestFlight / Play closed testing with real celebrity names.

---

## 2. X / Twitter API — access, pricing, policies

### Verified / reported facts

| Topic | Finding | Sources |
|---|---|---|
| Pricing model (2026) | New developers reported on **pay-per-usage credits**; legacy Basic ($200) / Pro ($5,000) closed to new signups; free tier discontinued for new developers | [SocialCrawl — X API 2026](https://www.socialcrawl.dev/blog/x-twitter-api-2026); [Blotato pricing guide](https://www.blotato.com/blog/twitter-api-pricing); [Postproxy tiers](https://postproxy.dev/blog/x-api-pricing-2026/); [TwitterAPI.io breakdown](https://twitterapi.io/blog/x-api-cost-breakdown-2026) |
| Approx. read cost | Third-party post reads commonly cited ~**$0.005 / resource**; owned reads ~$0.001; hard cap often cited at **~2M post reads / month** before Enterprise | Same as above; preview docs [X API pricing (Mintlify preview)](https://x-preview.mintlify.app/x-api/getting-started/pricing) |
| Enterprise | Publicly cited starting ~$42k+/mo | Same secondary sources |

**Caveat:** Official `docs.x.com` / `developer.x.com` pages returned HTTP 403 during this research pass. Treat dollar figures as **reported**, verify in Developer Console before budgeting.

### Display, storage, deletion (developer policy themes)

From archived / mirrored Developer Terms and Developer Guidelines summaries:

| Requirement | Implication for our app |
|---|---|
| Maintain integrity of displayed X Content; if not using X for Websites embeds, retrieve current version via API | Long-term local DB of full tweet text for offline party play **conflicts** with “always current” display expectations |
| Remove content when deleted/suspended or on request, often within **24 hours** | Offline caches need **forced invalidation** / kill-switch; party decks cannot forever ship deleted posts |
| Redistribution limits (Post IDs vs hydrated objects) | Cannot casually resell or bulk redistribute tweet corpora |
| No scraping / non-API access | Scraping is operationally and contractually unacceptable |
| AI/ML training restrictions (reported in guidelines summaries) | Do not train models on X content without explicit permission |
| Attribution / no alteration beyond display formatting | Do not “improve” or paraphrase real posts while labeling them authentic |
| Offline / broadcast display has separate rules | Forehead party mode is offline-ish—counsel + X display requirements review needed if showing X Content |

Sources: [OpenTermsArchive commit mirroring X Developer Terms](https://github.com/OpenTermsArchive/vlopses-us-versions/commit/ed8cd6e9e5e790d273f22ef95d99b7c0b64ef111); [Developer Guidelines summary](https://x-preview.mintlify.app/developer-guidelines); [Policies index](https://x-preview.mintlify.app/developer-terms).

### Can we store tweet text in our database?

**[Not definitive]** Policy language emphasizes retrieving current content for display and deleting when unavailable. Caching for performance is often contemplated in API ecosystems, but **permanent editorial mirrors for a commercial game** may violate developer terms even if technically feasible.

**Recommendation:** Assume **no** durable full-text X corpus in production without written X permission / counsel. Prefer **editorial paraphrase decks that are not X Content**, or **licensed datasets**, or **post-ID + on-demand hydrate** (poor fit for offline party MVP).

### Screenshots, embeds, engagement metrics

- Screenshots of posts: often create **copyright** (UI + text) and **trademark** issues; also conflict with “use official display paths.” Avoid as primary UX.  
- Official embeds: better for web; awkward for forehead RN game; may still require API access at scale.  
- Engagement metrics (likes/views): frequently restricted or unreliable; **do not** build “Which Went Viral?” on unofficial scrapes.

### Alternatives if X is too restrictive/expensive

1. **Editorially written “voice-alike” fabrications + verified public quotes from speeches/interviews** (with citations).  
2. **Licensed quote databases / publisher partnerships.**  
3. **Public-domain historical statements** (dead authors, expired rights—still check publicity where applicable).  
4. **User-submitted “my friend said” private decks** (later; still moderation).  
5. **Platform-neutral “posts”** that are original game content inspired by internet culture, not copies of specific tweets.  
6. **Post-ID reference only** in admin CMS for editors, never shipped to clients as X Content.

**MVP recommendation:** Hybrid **manual curation** without client dependency on X API.

---

## 3. Celebrity names, likenesses, right of publicity

**[Fact]** Right of publicity is primarily **state law**; individuals can control commercial use of name/likeness/voice/identity in many jurisdictions ([Justia overview](https://www.justia.com/entertainment-law/publicity-rights/); [Blank Rome on ROP + AI](https://www.blankrome.com/news-and-events/breaking-down-intersection-right-publicity-law-ai/); [Higgs Law examples](https://higgslaw.com/celebrities-sue-over-unauthorized-use-of-identity/); [DG Law Practical Law Q&A PDF](https://www.dglaw.com/wp-content/uploads/2021/09/Klausner_Edelman_Expert_QnA_Right_of_Publicity.pdf)).

**Risks for our game:**

- Using names + fabricated statements to sell an app may be framed as **commercial appropriation**.  
- Profile photos amplify likeness claims—**avoid in MVP**.  
- First Amendment / transformative use / public affairs defenses **may** apply to some expressive games—**highly fact-specific**; do not rely without counsel.  
- False endorsement under Lanham Act theories can arise from celebrity association in marketing.

**Safer patterns (product, not legal clearance):**

- Prefer **transformative party-game framing** and disclaimers (“entertainment; not affiliated”).  
- Avoid implying celebrity endorsement in store screenshots.  
- Start with **willing creator partnerships** or **fictional personas** for earliest prototypes.  
- Keep marketing copy about *the game*, not “official Taylor Swift quiz.”

---

## 4. Copyright in short posts

Short social posts may still be protected as literary works; thresholds vary. Copying substantial distinctive wording into a paid app is a copyright exposure even if short.

**Recommendation:** For authentic cards, prefer **licensed text**, **fair-use analysis by counsel** (risky as a business plan), or **link-out only** designs (weak for offline). Best MVP path: minimize verbatim X Content.

---

## 5. Defamation and false attribution

Fabricating that a living person said something harmful (criminality, bigotry, medical fraud, sexual misconduct, etc.) creates serious defamation risk even inside a “game,” especially if labeling is weak or cards leak as screenshots without context.

**Hard product rules (recommended):**

1. Fabrications must be **obviously labeled on reveal** and never designed to travel well as standalone “screenshots of proof.”  
2. Ban fabrications that allege crimes, hate, medical/financial advice, election fraud, or sexual conduct.  
3. Prefer absurd / stylistic / harmless fabrications.  
4. Maintain editorial review + audit log.  
5. Rapid takedown on complaint.

Google Play explicitly restricts false/misleading media about public figures, politics, and sensitive events, with carve-outs for **obvious satire/parody** and clear disclaimers ([Deceptive Behavior policy](https://support.google.com/googleplay/android-developer/answer/9888077)).

---

## 6. App Store and Google Play

### Apple

[App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — UGC apps must provide filtering, reporting, blocking, and contact info (Guideline 1.2). Updates in 2026 tightened developer responsibility for removing violating content (press: [MacRumors Jun 2026](https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/); [Apple Developer News Feb 6, 2026](https://developer.apple.com/news/?id=d75yllv4)).

Implications: public custom decks trigger full UGC stack; even editorial apps should ship **report flows**.

### Google Play

- [User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937)  
- [Deceptive Behavior](https://support.google.com/googleplay/android-developer/answer/9888077)  

Implications: clear satire labeling; no deceptive “fake news broadcast” aesthetics; moderation for any UGC.

### Age rating

Expect **12+** or higher depending on deck language and themes. Political or crude decks may force mature ratings and regional limits. Provide content descriptors honestly.

---

## 7. Privacy

MVP with no accounts: minimize data—local scores, analytics with privacy policy, no contacts scraping. If adding accounts later: GDPR/CCPA deletion, auth security, children’s data avoidance (do not target under-13).

Motion sensors: process on-device; do not upload raw IMU streams.

---

## 8. Content moderation requirements

Even without UGC, maintain:

- In-app report on each card  
- Admin queue with SLA  
- Deck/card remote disable  
- Sensitivity ratings and regional filters  
- Escalation path for legal threats  

With UGC (custom decks): terms acceptance, block users, proactive moderation—defer to Phase 3.

---

## 9. Safer product patterns (adopt for MVP)

| Pattern | Why |
|---|---|
| Label fabricated content clearly on reveal | Store deception + defamation mitigation |
| Avoid realistic harmful claims | Defamation / Play deceptive media |
| Licensed / public / editorially approved content | Copyright + ToS |
| Source records + optional link | Integrity, trust |
| Remove deleted/disputed cards via kill-switch | X deletion + complaints |
| No profile photos in MVP | Publicity / likeness |
| Human-written decoys, not AI impersonation | ROP + deepfake policy climate |
| Private-only custom decks later | UGC blast radius |
| Report + audit workflows | Store compliance |

---

## 10. Issues requiring counsel review (checklist)

1. Trademark clearance for product/mode names including “Tweet.”  
2. Right-of-publicity exposure for commercial celebrity-name party games in launch states.  
3. Defamation risk model for fabricated attributions.  
4. Whether any verbatim social posts may be stored/displayed offline.  
5. X Developer Agreement compliance if any X Content is used.  
6. Copyright fair use (likely insufficient as sole theory).  
7. Store listing claims and satire disclosures.  
8. Age rating and political content regionalization.  
9. Influencer/creator deck contracts.  
10. Insurance (media / E&O) before scale.

---

## 11. Operational recommendation

**Phase 0–1 content doctrine:**  
“Entertainment party cards. Authentic cards cite non-X or licensed sources where possible. Fabricated cards are original game writing, harmless, and labeled. No live social API in the client.”
