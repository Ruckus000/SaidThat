# Said That? mobile MVP

This is a local-first Expo app. It deliberately has no account, live social
feed, public upload, telemetry, or remote report delivery.

## Content safety

The bundled deck mixes `__DEV__` fixtures (visibly marked, never shipped as
editorial) with curated public-figure cards emitted by `tools/content-pipeline/`.
`src/domain/game.js` refuses to play an authentic card unless it has a retained
HTTPS source record and two distinct editorial approvals (or the explicit
pre-release owner marker). Cards that bypass that pipeline stay unplayable.

Disputed, removed, and source-unavailable records are excluded from binary
play. Reports are queued locally with only `cardId`, reason category, deck
version, timestamp, and a local run/round stamp. The local queue is capped at
100 records. No identity, statement text, source URL, free text, motion data,
or transcript is persisted.

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
npm run export:ios
npm run export:android
```

See `native-verification-checklist.md` for the manual device verification template. It makes no release pass claim.

## Brand assets

The icon, splash and favicon PNGs in `assets/` are THE SPLIT — `MARK_PATHS.open` with its two
commas in lime and pink on `#0B0E13`. The composition lives in `assets/brand/split-mark.svg`,
which nothing imports at runtime; it is the source the PNGs were rendered from. Changing the
`open` glyph in `src/components/markPaths.js` does not regenerate them — the SVG and the PNGs
both need re-cutting by hand. See "The mark as icon" in `docs/ux-design-direction.md`.

Native iOS/Android accessibility and lifecycle evidence is still required for
release under the repository's DesignOps policy.
