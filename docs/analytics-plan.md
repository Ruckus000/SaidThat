# Analytics Plan

**Date:** 2026-07-18  
**Tool:** PostHog (recommended)

---

## 1. Principles

- Validate fun before optimizing monetization  
- Prefer `card_id` over raw statement text in events  
- Respect OS consent / ATT where applicable  
- Kill analytics noise in active motion loop (no per-sample events)

---

## 2. Event taxonomy (MVP minimum)

| Event | Key properties |
|---|---|
| `app_opened` | app_version, platform |
| `onboarding_completed` | control_mode_default |
| `deck_viewed` | deck_id |
| `deck_selected` | deck_id, content_version |
| `deck_download_completed` | deck_id, bytes, duration_ms |
| `round_started` | mode, deck_id, timer_s, player_count |
| `card_displayed` | card_id, deck_id, index |
| `answer_submitted` | card_id, guess, input_method, latency_ms |
| `answer_correct` | card_id, input_method |
| `answer_incorrect` | card_id, input_method |
| `card_skipped` | card_id |
| `round_completed` | score, accuracy, cards_played, correct, incorrect, skipped |
| `rematch_started` | previous_score |
| `results_shared` | channel |
| `report_submitted` | card_id, reason |
| `motion_control_disabled` | reason |
| `deck_purchased` | sku (Phase 2) |

---

## 3. Success metrics

| Metric | Definition |
|---|---|
| Round-start conversion | Home → round_started |
| Round-completion rate | completed / started |
| Cards per round | mean cards answered |
| Accuracy | correct / answered |
| Rematch rate | rematch / completed |
| Sessions per group | proxy via rematch chains |
| D1 / D7 retention | if identity exists; weak in anon Phase 1 |
| Share rate | share / completed |
| Crash-free sessions | Sentry |
| Motion error rate | fallbacks / forehead rounds |
| Deck completion | unique cards seen / deck size over time |
| Paid conversion | Phase 2 |

---

## 4. North-star metric (MVP)

**Rematch rate after completed rounds** (target ≥40% in soft launch cohorts).

Secondary: round-completion rate ≥75%.

---

## 5. Dashboards

1. Funnel: open → select deck → start → complete → rematch  
2. Input health: tilt vs tap share; motion disable reasons  
3. Content: report rate by deck/card  
4. Stability: crash-free  

---

## 6. Experiments (later)

- Timer length 45 vs 60  
- Negative scoring on/off  
- Deck order recommendations  
