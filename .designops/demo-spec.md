# Room Beacon working-demo specification — simulation-backed draft

## Representative route

1. **Home:** disclose local fixtures and absence of account, live feed, and telemetry.
2. **Setup:** select Room Beacon or Private Relay and choose holder or screen-facing role where relevant.
3. **Active round:** render persistent game beacon, one shared fixture statement, role instruction, and two 56 dp-equivalent tap paths. Hide active card descendants from the Room Beacon holder's assistive technology.
4. **Commit/result:** accept one answer only, calculate at most one score change, then offer neutral review or continuation.
5. **Truth review/report:** label fixture status explicitly, explain source limitations, and queue a minimised local report payload.
6. **Recovery:** pause Room Beacon safely; for Private Relay background interruption, discard protected prior state and show the shutter before a fresh turn.
7. **Content unavailable:** show a clear non-playable state for corrupt, withheld, removed, disputed, or unavailable content.

## Non-negotiable behavior

- No public-figure candidate becomes playable without retained source evidence and two distinct human editorial approvals.
- No route requires motion, audio, haptics, account sign-in, network connectivity, a countdown, or color-only status meaning.
- Native VoiceOver/TalkBack, dynamic text, device lifecycle, offline behavior, sensor behavior, and performance remain release verification tasks.
