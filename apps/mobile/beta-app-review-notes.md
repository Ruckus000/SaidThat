# Beta App Review submission text

Draft for App Store Connect → TestFlight → Test Information. Three fields, ready
to paste. Every number here was checked against the shipped build (`DECK_VERSION`
0.3.0, version 1.0.0 build 2) rather than from the planning docs, which describe
release-bar controls this build does not yet meet.

Replace `<feedback email>` before submitting.

---

## Field 1 — Beta App Description

> SaidThat is a party game for a group sharing one phone. A quote appears on
> screen and the room argues about whether the named person really said it, then
> the phone reveals the answer.
>
> The deck mixes genuine quotes from public figures with quotes written for the
> game. Every card states which it is at the reveal, alongside the source record
> for genuine ones.
>
> No account, no sign-in, and no internet connection are required. Everything
> stays on the device.

---

## Field 2 — What to Test

> Play a full run of ten prompts and tell us whether the game is fun with other
> people in the room, not alone.
>
> Specifically:
> - Is the reveal clear about which quotes are real and which were made up?
> - Does the pace hold, or does it drag?
> - Try both modes on the setup screen. Room Beacon is for holding the phone up
>   so others read it; Private Relay is for passing the phone around and hides
>   each turn behind a shutter.
> - Try it with the system text size turned up, and with VoiceOver on.
> - If any card looks wrong, misattributed, or offensive, use "See a content
>   issue?" on the reveal screen. Then tell us — those reports are stored on
>   your device only and are never transmitted, so we cannot see them.

---

## Field 3 — App Review Notes

> WHAT THIS IS
> A party game. A quote appears, the room decides whether the named public
> figure actually said it, and the app reveals the answer. One device, no
> account, no network.
>
> THE POINT YOU WILL WANT TO CHECK
> This build contains genuine quotes from real public figures alongside quotes
> invented for the game. No card is left ambiguous: every one is explicitly
> labelled at the reveal, and the labels differ in wording and in their leading
> mark, not by colour alone.
>
> HOW TO SEE THAT IN UNDER A MINUTE
> 1. Tap START A ROOM, then LET'S PLAY.
> 2. Answer with either button (SAID IT / TOTAL LIE).
> 3. Tap SEE THE TRUTH.
>
> The reveal shows one of:
> - "AUTHENTIC · THEY SAID IT" — with the real context and a line reading
>   "Source status: verified source on file — <domain>".
> - "FABRICATED FOR THIS GAME" — with "Source status: game fixture."
>
> Tap NEXT PROMPT and repeat to see both kinds. Roughly half the deck is each.
>
> CONTENT CONTROLS
> - 74 playable cards in this build: 34 genuine, 40 invented, across 46 distinct
>   public figures.
> - All 34 genuine cards carry a retained HTTPS source record, shown in the app
>   on the reveal screen.
> - Cards can only enter the app through a build-time editorial pipeline that
>   requires two independent citations (an archive capture counts as one),
>   refuses low-confidence sources as genuine, enforces a read-aloud length
>   limit, and applies a sensitivity check.
> - An invented quote may never name any real person other than the speaker it
>   is attributed to.
> - Excluded outright: election falsehoods, hate content, criminal accusations,
>   sexual content, and medical or financial advice.
> - Every shipped card was reviewed and signed off by the developer acting as
>   editor before it was included.
> - Some invented quotes were AI-drafted and then rewritten and owned by a human
>   editor. The app discloses that on the reveal for those cards.
> - Records that are disputed, withdrawn, or whose source is no longer reachable
>   are retained in the data but can never be served as a game prompt.
>
> PRIVACY
> - No accounts, no sign-in, no user-generated content, no social features.
> - No network requests of any kind. The shipped source contains no fetch,
>   XMLHttpRequest, WebSocket, or HTTP client call sites. The app functions fully
>   in airplane mode.
> - No analytics, advertising, tracking, or third-party SDKs.
> - The in-app content report writes to local device storage only: a card
>   identifier, a reason code, the deck version, a timestamp, and a local
>   run/round number. No player identity and no free text, and nothing is
>   transmitted anywhere.
> - Export compliance is declared as exempt on the basis above.
>
> REPORTING AND REMOVAL
> Every reveal screen carries "See a content issue?" with three reason chips.
> Anyone depicted, or any reviewer, can reach us at <feedback email>. A card can
> be withdrawn so that it becomes unplayable in the following build.
>
> NO DEMO ACCOUNT IS NEEDED — the app has no login.

---

## Accuracy notes for whoever submits this

Claims deliberately **not** made, because they are not true of this build:

- **Not** "two independent editorial approvals". All 74 shipped cards carry a
  single `owner:pre-release` approval. The two-person rule is the release bar in
  `docs/mvp-build-queue.md`, and this build does not meet it. The text says
  "reviewed and signed off by the developer acting as editor", which is what
  actually happened.
- **Not** "legally cleared" or "rights cleared". No such clearance exists.
- **Not** "accessibility tested". Every VoiceOver and TalkBack row in
  `native-verification-checklist.md` is still NOT OBSERVED. The What to Test
  field asks testers to try VoiceOver precisely because it is unverified.

Verified before writing, against the release-configuration deck:

| Claim | Check |
| --- | --- |
| 74 playable, 34 genuine / 40 invented | `playableDeck(catalog, {allowLocalFixtures:false})` |
| 46 distinct figures | distinct `person` over that deck |
| 34/34 genuine have retained HTTPS source | `sourceRecord.retained && /^https:/` |
| Label strings | `presentationLabels.js` |
| Report payload fields | `reportPayload` in `domain/game.js` |
| No network call sites | grep over shipped source |

Note the simulator build plays 81 cards, not 74 — `__DEV__` admits seven
development fixtures that the TestFlight build excludes. Quote the 74 figure.
