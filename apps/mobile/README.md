# Said That? mobile MVP

This is a local-first Expo app. It deliberately has no account, live social
feed, public upload, telemetry, or remote report delivery.

## Content safety

The bundled cards are development-only fixtures. They are visibly marked in the
app and do not name public figures; two use a **simulated-authentic** truth
state solely to exercise the game mechanic. `src/domain/game.js` refuses
to play an authentic card unless it has a retained HTTPS source record and two
distinct editorial approvals. This repository does not create those human
approvals; release content remains blocked until the editorial workflow exists.

Disputed, removed, and source-unavailable records are excluded from binary
play. Reports are queued locally with only `cardId`, reason category, deck
version, and timestamp. No identity, statement text, source URL, free text,
motion data, or transcript is persisted.

## Resilience and chaos checks

The pure reducer is the safety boundary. Its tests inject failure conditions:

- malformed or unapproved content;
- duplicate answer taps;
- private handoff and background interruption;
- screen-reader holder spoiler prevention;
- corrupt decks and malformed report reasons;
- a 500-event deterministic action storm.

Run:

```bash
npm run typecheck
npm test
npx expo export --platform ios --output-dir /private/tmp/said-that-ios-export
```

Native iOS/Android accessibility and lifecycle evidence is still required for
release under the repository's DesignOps policy.
