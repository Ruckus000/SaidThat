# Phase 0 deck schema (planning)

**Status:** Historical planning schema. Runtime validation now lives in `tools/content-pipeline/` and `apps/mobile/src/domain/` (`contentRules.js`, `isPlayableCard`, `validateDeck.js`). There is no `packages/content-validation` package.  
**Package / brand id (engineering):** `SaidThat` (`com.saidthat.app` provisional)

## Zod shape (canonical)

```ts
import { z } from "zod";

export const AuthenticitySchema = z.enum(["authentic", "fabricated"]);
export const SensitivitySchema = z.enum(["everyone", "teen", "mature"]);

export const CardSchema = z.object({
  id: z.string().uuid(),
  figureId: z.string().uuid(),
  displayName: z.string().min(1).max(80),
  statementText: z.string().min(1).max(500),
  authenticity: AuthenticitySchema,
  difficulty: z.number().int().min(1).max(5),
  sensitivity: SensitivitySchema,
  explanation: z.string().min(1).max(600),
  sourceUrl: z.string().url().nullable(),
  category: z.string().min(1).max(40),
  /** Editorial only — strip or omit from client if desired later */
  editorialNotes: z.string().max(1000).optional(),
});

export const DeckSchema = z.object({
  deckId: z.string().uuid(),
  slug: z.literal("phase0-pop-voices"),
  title: z.string(),
  description: z.string(),
  contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  sensitivity: SensitivitySchema,
  cards: z.array(CardSchema).min(1),
  tombstones: z.array(z.string().uuid()).default([]),
});

export type Deck = z.infer<typeof DeckSchema>;
export type Card = z.infer<typeof CardSchema>;
```

## Empty deck skeleton

See `phase0-deck.empty.json` for a valid empty-ish structure (zero cards) used to lock the file shape.  
Playable candidates (researched) are in `phase0-deck.candidates.json` — **historical research corpus**, not the live deck. The shipped bundle is `apps/mobile/src/content/deck.generated.js`, emitted from `tools/content-pipeline/`.

## Rules for this deck

- Party-safe: no politics pack, no death announcements, no sexual content, no hate/crime fabrications  
- Authentic cards cite a **reputable article or archive** in `sourceUrl` (not an unofficial scrape API)  
- Fabrications: original harmless voice-alike; `sourceUrl: null`; explanation must say made up for the game  
- ~45–55% authentic target when filled  
