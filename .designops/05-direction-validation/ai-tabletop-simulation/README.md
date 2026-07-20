# AI tabletop simulation — Room Beacon versus Private Relay

**Status:** Simulation-only design pressure test. It is not participant evidence, a signed validation plan, a Direction decision, or implementation permission.

## Purpose

This package makes the pre-study comparison more realistic by role-playing two frozen candidates through sober and alcohol-affected/high-distraction conditions. It uses published behavioral mechanisms as constraints on the simulation, not as proof that this product will produce a particular outcome.

The simulation must never be used to:

- represent AI output as user research, accessibility testing, or a completed study session;
- estimate human success rates, fun, accessibility, safety, or market fit;
- justify alcohol use, administer alcohol, or recruit intoxicated people;
- clear a Direction gate, replace the signed independent-study plan, or create `results.json`.

## What it does

The simulation compares Room Beacon and Private Relay on the exact shared fixture, four condition cells, and six human-psychology gates in [human-psychology-gate.json](human-psychology-gate.json). The output is a list of hypotheses and must-test risks in [tabletop-trace.md](tabletop-trace.md).

## Condition framing

“Alcohol-affected” is a bounded attention/inhibition stress condition derived from acute-alcohol research. It does not describe a type of person or predict any individual’s behavior. Effects vary with dose, context, expectations, and person; the simulator must preserve that uncertainty.

| Condition | Purpose | Forbidden inference |
|---|---|---|
| Sober, ordinary party distraction | Baseline role, readability, and group-ritual pressure | “This will work for all sober groups.” |
| Sober, high noise/distraction | Stress spoken consensus, memory, and capture context | “Noise alone proves a design failure.” |
| Alcohol-affected, ordinary party distraction | Stress inhibition and cue salience without making drunkenness the product | “All drinkers behave impulsively.” |
| Alcohol-affected, high noise/distraction | Combine the two documented stress mechanisms conservatively | “AI can predict intoxicated participants.” |

## Required next step

Use the simulation only to sharpen the signed six-session human study. The external study must still freeze actual devices, conditions, and editorial cards; recruit role-appropriate accessible participants; and record anonymized real outcomes under [../plan.json](../plan.json).
