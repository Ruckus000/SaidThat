/**
 * Development fixtures only. They are clearly fabricated and contain no
 * public-figure attribution. Release content must come from the editorial
 * pipeline and satisfy isPlayableCard() without allowLocalFixtures.
 */
export const DECK_VERSION = "0.1.0-local-fixture";

export const catalog = [
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
