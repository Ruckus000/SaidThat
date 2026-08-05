/**
 * The playable catalog: curated cards emitted by the content pipeline, plus the
 * local development fixtures below.
 *
 * The fixtures are clearly fabricated and contain no public-figure attribution.
 * They stay inert in a release build because isPlayableCard() gates every
 * `fixtureOnly` record behind allowLocalFixtures, which App.tsx sets from
 * __DEV__. Curated cards come from deck.generated.js and must satisfy
 * isPlayableCard() without that flag.
 *
 * The fixture array is written inline and verbatim on purpose: the DesignOps
 * policy test reads this file as text and asserts it still contains
 * `fixtureOnly: true`, so moving the fixtures into another module would turn CI
 * red without any behaviour changing.
 */
import {
  GENERATED_DECK_VERSION,
  generatedCards,
  generatedTombstones,
} from "./deck.generated.js";

/**
 * Falls back to the fixture version string while no curated cards exist, so a
 * dev build still reports something meaningful rather than "0.0.0".
 */
export const DECK_VERSION = generatedCards.length > 0 ? GENERATED_DECK_VERSION : "0.2.0-local-fixture";

export const TOMBSTONES = generatedTombstones;

const fixtures = [
  {
    id: "fixture-aurora-01",
    quote: "I schedule my best ideas for after the snacks arrive.",
    person: "Avery Rook",
    authentic: false,
    contentState: "fabricated-for-game",
    fixtureOnly: true,
    explanation: "Fabricated for this local development game fixture.",
  },
  {
    id: "fixture-river-02",
    quote: "I collect alarm clocks because one is never enough.",
    person: "River Vale",
    authentic: true,
    contentState: "fixture-authentic",
    fixtureOnly: true,
    explanation: "Simulated-authentic development fixture. It is not a public-figure claim or a source-verified production card.",
  },
  {
    id: "fixture-sage-03",
    quote: "I trained for this interview by losing an argument to a toaster.",
    person: "Sage North",
    authentic: false,
    contentState: "fabricated-for-game",
    fixtureOnly: true,
    explanation: "Fabricated for this local development game fixture.",
  },
  {
    id: "fixture-jonah-04",
    quote: "My secret talent is finding the one squeaky floorboard in every room.",
    person: "Jonah Pike",
    authentic: true,
    contentState: "fixture-authentic",
    fixtureOnly: true,
    explanation: "Simulated-authentic development fixture. It is not a public-figure claim or a source-verified production card.",
  },
  {
    id: "fixture-mira-05",
    quote: "I write my to-do list in rhymes so procrastination feels poetic.",
    person: "Mira Holt",
    authentic: false,
    contentState: "fabricated-for-game",
    fixtureOnly: true,
    explanation: "Fabricated for this local development game fixture.",
  },
  {
    id: "fixture-cole-06",
    quote: "I rehearse handshakes in mirrors and still miss every time.",
    person: "Cole Wynn",
    authentic: false,
    contentState: "fabricated-for-game",
    fixtureOnly: true,
    explanation: "Fabricated for this local development game fixture.",
  },
  {
    id: "fixture-ember-07",
    quote: "I keep a spreadsheet ranking every snack by crunch volume.",
    person: "Ember Lane",
    authentic: true,
    contentState: "fixture-authentic",
    fixtureOnly: true,
    explanation: "Simulated-authentic development fixture. It is not a public-figure claim or a source-verified production card.",
  },
  {
    id: "withheld-disputed-01",
    quote: "Not shown to players.",
    person: "Withheld record",
    authentic: false,
    contentState: "disputed",
    explanation: "Disputed records are never binary game prompts.",
  },
  {
    id: "withheld-source-01",
    quote: "Not shown to players.",
    person: "Withheld record",
    authentic: false,
    contentState: "source-unavailable",
    explanation: "A source-unavailable record is paused until editorial review.",
  },
  {
    id: "withheld-removed-01",
    quote: "Not shown to players.",
    person: "Withheld record",
    authentic: false,
    contentState: "removed",
    explanation: "Removed records supersede cached local content.",
  },
];

/**
 * Curated cards first so they lead the pool; the run-builder reorders anyway,
 * and in a release build the fixtures are filtered out entirely.
 */
export const catalog = [...generatedCards, ...fixtures];
