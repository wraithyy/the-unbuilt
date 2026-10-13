# QA

## Automated (what is actually verified)

- `pnpm test` — unit tests for collision, player, observation hysteresis, portals,
  perspective, gravity, conditions, save/load (corrupt + incompatible), audio cue mapping,
  and **scripted solves of every area with the real simulation** (walk, look, grab, drop,
  jump), plus reset and secret tests per area.
- `pnpm e2e` — Playwright against a production build: boot without errors, main menu,
  portfolio without playing (focus return on Escape), keyboard play through Arrival into
  the Atrium, checkpoint + flags restored after reload, pause hint/reset, corrupt save
  notice; mobile project (Pixel 7 emulation, touch): joystick moves, right-half drag looks,
  no page scroll, overlay fits a phone without horizontal scroll; arrow-key look without a
  mouse; Settings dialog focus trap and focus restore.
- Headless rendering uses SwiftShader (CPU WebGL); frame times there are not device data.

## Measured render stats (headless, 1280×720, Medium quality, from each area's spawn)

| Area | Draw calls | Triangles |
|---|---|---|
| arrival | 112 | 13.8k |
| atrium | 84 | 13.7k |
| loop | 74 | 13.7k |
| perspective | 45 | 13.6k |
| inversion | 68 | 13.7k |
| convergence | 59 | 13.5k |
| ending | 38 | 13.0k |

Bundle: JS 1.24 MB raw / 346 kB gzip, CSS 10.7 kB gzip, fonts ~70 kB woff2.
Reproduce: `pnpm dev`, then `node scripts/perf.mjs http://localhost:5173/?debug`.

## Not verified

- **No physical device testing.** iOS Safari and Android Chrome behaviour is unverified
  beyond Chromium mobile emulation. Use the checklist below.
- Real fps on mobile GPUs. Adaptive DPR and the Low preset (no shadows, DPR 1) are the
  mitigations; numbers above are draw-call/triangle counts only.
- Audio was never listened to by a human. Measured in headless Chromium (2026-10-13): score RMS about -28 dBFS, peaks about -14 dBFS, no clipping; closed eyes drop RMS from 0.05 to 0.03; mute reaches silence.
- Full human playthrough timing (target 15–25 min) — not measured.

## Manual checklist — iOS Safari / Android Chrome

Setup: open the deployed URL, landscape, sound on (iOS: silent switch off).

1. Portrait: menu readable, "Enter" reachable; in-game a "turn sideways" note appears.
2. Rotate to landscape mid-game: canvas resizes, controls stay in the corners, no scroll.
3. Left thumb anywhere on the left half: joystick appears under the thumb; moving it walks.
   Lift the thumb outside the screen edge: movement stops (no stuck input).
4. Right thumb drag looks around while the left thumb walks (two fingers at once).
5. Use / Jump buttons respond while walking; Use label changes to take / place / no room.
   Hold the eye button with the right thumb while walking with the left: blueprint view,
   releasing restores the world.
6. Pull-to-refresh, pinch zoom, text selection, long-press callouts never trigger in play.
7. Notch / home indicator: HUD buttons and touch buttons not under safe areas.
8. Switch apps / lock screen mid-game: game pauses; resume continues; audio resumes.
9. Kill the tab after reaching the Atrium; reopen: "Continue" restores the Atrium.
10. Settings: sensitivity, joystick size, reduced motion (gravity turns become a short fade),
    quality Low/Medium/High (High may be heavy on older phones).
11. Portfolio from the menu and from the in-game JK button: scrolls vertically, links open,
    close returns to the game.
12. Arrival → Atrium in under ~2 minutes for a first-time player without hints.
13. Inversion: gravity rolls do not cause discomfort with reduced motion on.
14. Low-power mode (iOS): game still playable at Low quality.

## Known limitations

- Observation is a frustum test: walls do not occlude "being watched"; areas are designed
  around it.
- Held cubes do not collide while held (they are placed by a ray); the drop is refused
  ("no room") when the cube would overlap anything.
- Captions only rotate about the vertical axis, so text is never upright for an inverted
  player (the Inversion secret is designed around it).
- Fullscreen and orientation lock are not requested (not reliably available on iOS).
