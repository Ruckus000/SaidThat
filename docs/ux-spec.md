# UX and Accessibility Spec

**Date:** 2026-07-18  
**Platform:** React Native (iOS + Android)  
**Visual direction:** Bold, fast, playful, high contrast, legible at distance; optimized for dark rooms and forehead play.

---

## 1. Visual system (direction)

### Principles
- One job per screen  
- Party energy without clutter  
- Brand mark is hero on Home; gameplay screens prioritize **statement readability** over chrome  
- No dense dashboard aesthetics  

### Tokens (draft)
| Token | Value guidance |
|---|---|
| `--bg` | Deep ink `#0B0F14` with subtle radial gradient / noise (not flat black) |
| `--surface` | `#141A22` |
| `--text` | `#F5F7FA` |
| `--accent-yes` | Electric mint `#2EE6A6` |
| `--accent-no` | Hot coral `#FF5A5F` |
| `--warn` | Amber `#FFC857` |
| `--font-display` | Expressive sans (e.g. Clash Display / Satoshi / similar—**not** Inter/Roboto/system default as brand face) |
| `--font-body` | Highly legible grotesque for long statements |
| Radius | Modest (8–12); avoid pill soup |
| Motion | Snappy 200–320ms; respect reduced motion |

Avoid: purple-glow AI defaults; cream-serif terracotta cliché; newspaper broadsheet layouts.

### Active card typography
- Statement: dynamic type scaling — start ~42–56pt, shrink to fit (min ~28pt) with max 8–10 lines  
- Attribution: ~22–28pt, secondary contrast  
- Timer: persistent, large, top-safe-area  

---

## 2. Screen inventory

### Onboarding
- **Purpose:** Explain the game in 3 screens max; set motion vs tap preference.  
- **Primary actions:** Continue, Skip, Choose control mode.  
- **Hierarchy:** Demo illustration → one sentence → CTA.  
- **Nav:** Linear; skip to Home.  
- **Empty/Error:** N/A.  
- **A11y:** Full VoiceOver; don’t auto-advance.  
- **Motion/Haptics:** Light page transitions; selection haptic on control mode.

### Home
- **Purpose:** Brand + start playing.  
- **Primary actions:** Play Party, Pass-and-Play, Decks, Settings.  
- **Hierarchy:** Brand → primary CTA → secondary.  
- **Empty:** If no decks downloaded → prompt download.  
- **Error:** Download failure banner with retry.  
- **A11y:** Large CTAs; announce brand.  
- **Motion:** Subtle logo idle; CTA press scale.

### Mode selection
- **Purpose:** Choose Format A vs B.  
- **Primary:** Select mode.  
- **Hierarchy:** Two large options with one-line explanations.  
- **A11y:** Describe motion requirements for Party mode.

### Deck browser
- **Purpose:** Pick content pack.  
- **Primary:** Select deck, Download/Update.  
- **Hierarchy:** Cover/title → rating badge → card count → select.  
- **Empty:** “No decks yet” + retry sync.  
- **Error:** Corrupt package → redownload.  
- **A11y:** Announce rating and size.

### Player / team setup (Format B)
- **Purpose:** Local roster.  
- **Primary:** Add/remove players, toggle teams, Start.  
- **Empty:** Need ≥2 players to start.  
- **Error:** Duplicate names warning (non-blocking).  
- **A11y:** Form labels; reorder controls.

### Pre-round instructions
- **Purpose:** Orient the group.  
- **Primary:** Start Round.  
- **Content:** Control cheatsheet; tip “hold steady before tilting.”  
- **A11y:** Tap-mode instructions swap automatically.

### Countdown
- Full-screen 3-2-1; haptic each beat; audio optional.  
- Reduced motion: static numbers, no bounce.

### Active game card
- **Purpose:** Maximum readability decision UI.  
- **Orientation:** Landscape locked during forehead rounds (recommended); portrait allowed in tap mode.  
- **Safe areas:** Timer and controls inset; statement centered.  
- **Accidental touches:** Ignore edges; confirm destructive pause via hold.  
- **Wake lock:** Keep screen on for round duration.  
- **Hierarchy:** Statement → attribution → timer → discreet pause.  
- **Controls:** Invisible tilt zones OR large Yes/No buttons in tap mode.  
- **Haptics:** Distinct patterns for yes/no/skip registered.  
- **Audio:** Optional tick in last 10s; answer blip.  
- **Error:** Sensor unavailable → auto-fallback tap mode modal.  
- **A11y:** VoiceOver reads statement and buttons; motion mode disabled when VO on (default tap).

### Pause
- Resume, End round, Control settings, Report (rare mid-round).  
- Confirm end round.

### Round results
- Big score, accuracy, counts.  
- CTAs: Review, Rematch, Home, Share.  
- Motion: confetti optional; respect reduced motion.

### Card review
- Horizontal pager or list.  
- Authenticity badge always visible.  
- Source / Report actions.  
- Empty: no cards played.

### Match scoreboard (Format B)
- Ranked players/teams; Next round CTA.

### Settings
- Timer default, sounds, haptics, motion sensitivity, reduced motion, content rating filter, privacy/analytics, licenses.

### Content report flow
- Reason chips: incorrect authenticity, offensive, harmful claim, copyright, other.  
- Free-text optional.  
- Success confirmation; card optionally hidden locally pending sync.

### Admin / curator (web, not mobile MVP UI detail)
- See `content-operations.md`. Mobile does not include admin.

---

## 3. Active-game readability checklist

| Topic | Spec |
|---|---|
| Dynamic text sizing | Fit algorithm with min font + scroll as last resort (prefer fit) |
| Orientation | Forehead: landscape; Pass-and-play: portrait default |
| Safe areas | Notch/home indicator respected |
| Accidental touches | 300ms ignore window after card appear; palm rejection via inset buttons |
| Motion sensitivity | Low/Med/High + calibration |
| Reduced motion | Settings + OS setting |
| Color blindness | Icons + labels |
| VoiceOver / TalkBack | Tap mode forced when screen reader active |
| Tap-only / no-motion | First-class modes |
| Haptics | Confirm answers |
| Audio cues | Optional |
| Wake lock | `activateKeepAwake` during active round |

---

## 4. Animation budget (intentional motions)

1. Countdown pulse  
2. Card advance swipe/fade  
3. Results score count-up  

No decorative parallax during active play.

---

## 5. Copy tone

Short, punchy, non-condescending. After fabrications: “Made up for the game — not a real post.” Never “Gotcha, idiot.”
