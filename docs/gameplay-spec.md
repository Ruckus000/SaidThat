# Gameplay Specification

**Date:** 2026-07-18  
**MVP modes:** Real or Fake · Format A (forehead) · Format B (pass-and-play)

---

## 1. Design goals

- Understandable in **&lt;10 seconds**  
- Readable from **several feet** away  
- One decision per card: **Really posted/said** vs **Did not**  
- Round length **45–60 seconds** default (settings: 30 / 45 / 60 / 90)  
- Social, funny, surprising—not punitive or gotcha-political  

---

## 2. Format A — Heads Up–style local party

### Setup
1. Choose deck.  
2. Optional: “Who is holding the phone?” (for results flavor only).  
3. Show instructions: phone facing players / forehead; tilt or tap.  
4. Countdown 3-2-1.  

### During round
- Display: large statement text, attribution name, timer, progress (optional card count).  
- **Do not** show authenticity until answered or round ends.  
- Controls:
  - Tilt down → “They did” (authentic guess)  
  - Tilt up → “They did not” (fabricated guess)  
  - Pass / skip: double-tap or dedicated button (accessibility settings)  
  - Tap-only mode available  

### After each answer
- Brief flash (correct/incorrect color) optional; can disable to reduce spoiler for holder.  
- **Recommendation:** In forehead mode, **delay full reveal** until review so the holder isn’t spoiled mid-round by friends’ reactions alone—friends already see the card. Actually friends see the card on the phone facing them; the holder does not. Flash can show to everyone. Keep flash &lt;400ms then next card.

### End of round
Show:
- Correct, incorrect, skipped counts  
- Accuracy %  
- Score (see scoring)  
- Rematch / Review / Home  

### Review
For each card:
- Statement + name  
- Badge: **Verified authentic** or **Fabricated for this game**  
- Short explanation  
- Source link button when `source_url` present and allowed  
- Report button  

---

## 3. Format B — Pass-and-play

### Setup
- Create 2–8 local players (names only, device-local).  
- Optional teams (2 teams).  
- Select deck, rounds count (default 3), timer.  

### Turn structure
1. Player N’s turn announcement.  
2. Timed round same as Format A but **tap controls default** (motion optional).  
3. Score added to player/team.  
4. Pass phone prompt.  
5. Match scoreboard between rounds.  
6. Final winner + rematch.  

---

## 4. Format C — Multiplayer (not MVP)

Deferred evaluation:
- Room code, simultaneous answers, speed bonuses.  
- Requires accounts or durable guest IDs, anti-cheat light, realtime infra.  
- See architecture doc for later options (Supabase Realtime vs Ably).  

**Decision:** Exclude from MVP.

---

## 5. Real or Fake — card rules

### Card states
- `authentic` — statement was actually said/posted by the attributed person (per editorial verification).  
- `fabricated` — original game content, not an authentic post; labeled on reveal.  

### Presentation before answer
```
[ STATEMENT TEXT ]

— Display Name
```

### Forbidden card types (MVP editorial policy)
- Allegations of crimes, hate, sexual conduct, medical/financial advice, election fraud  
- Deepfake voice/photo presentation  
- Unlabeled satire that could screenshot-travel as real news  
- Minors as subjects  

### Difficulty
- Easy: distinctive voice / well-known quotes  
- Medium: plausible either way  
- Hard: stylistic traps  

Mix per deck: ~45–55% authentic target for unpredictability.

---

## 6. Scoring

### Format A (group score)
- +100 authentic correct  
- +100 fabricated correct  
- +0 skip  
- −25 incorrect (optional; default **on** for spice, setting to disable)  
- Streak bonus: +10 per consecutive correct after 3 (cap +50)  

### Format B
Same per player; team mode sums players.

### Speed (MVP)
No speed bonus in forehead mode (unfair to holder). Optional in pass-and-play Phase 2.

---

## 7. Deck selection rules

- Deck metadata: title, description, card count, content rating, categories, version.  
- Offline play requires downloaded deck package.  
- Sensitivity: `everyone` / `teen` / `mature` — filter by settings.  

---

## 8. Accessibility gameplay requirements

- Tap-only mode  
- No-motion mode  
- Left/right button layout option (instead of up/down)  
- Reduced motion (fade instead of shake)  
- Screen reader labels for all controls  
- Minimum tap targets 48dp  
- Colorblind-safe correct/incorrect (icons + text, not color alone)  
- Pause anytime  

---

## 9. Session model (logical)

```
GameSession
  mode: forehead | pass_play
  deckId, deckVersion
  timerSeconds
  players[]
  rounds[]
    answers[]
      cardId, guess, correct, latencyMs, inputMethod
  scoreSummary
```

All MVP sessions are **local-first**; optional analytics upload only.

---

## 10. Non-goals for gameplay MVP

- Chat, avatars, friends list  
- Video recording of faces (Heads Up feature)—defer (privacy + complexity)  
- Live opponent matchmaking  
- Daily challenge solo mode  
