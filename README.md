# The Unbuilt

> Reality is just an implementation detail.

A surreal first-person puzzle game for desktop and mobile browsers. It is also Josef
Kvapil's portfolio ([jkvapil.cz](https://jkvapil.cz)). Rules are discovered, not explained:
a door is a wall only while someone watches it — close your eyes and the world shows its
unwatched blueprint; a corridor repeats itself, what you hold keeps its apparent size, and
any red surface can become the floor. The architecture is only built where you look; the
portfolio is written in anamorphic shards that read from a single point.

Play: https://unbuilt.jkvapil.cz (Cloudflare Pages, deployed on push to main)

Installable as an app (PWA): on Android Chrome use "Install app", on iOS Safari Share → "Add to Home Screen". It launches full-screen and plays offline after the first load.

## Run

```sh
pnpm install
pnpm dev              # http://localhost:5173
pnpm build            # typecheck + production bundle in dist/
pnpm test             # vitest unit + scripted-solve tests
pnpm e2e              # Playwright, desktop + mobile (Pixel 7, touch) against a production build
pnpm lint             # biome
```

First Playwright run: `npx playwright install chromium`.

`?debug` in the URL exposes the running game as `window.__unbuilt` (and the renderer as
`window.__gl`) for tests and inspection. `scripts/*.mjs` are headless helpers (tour
screenshots, per-area render stats); run them from the repo root against `pnpm dev`.

## Controls

| | Desktop | Touch |
|---|---|---|
| Move | WASD | left thumb (floating joystick) |
| Look | mouse (click canvas to lock) or arrow keys | drag with right thumb |
| Take / place | E, F, Enter or click | context button |
| Close your eyes | Q (hold; toggle in settings) | hold the eye button |
| Jump | Space | Jump button |
| Pause | Esc | II button |
| Sound on/off | M | speaker button |

The portfolio (JK button, menus) is reachable at any time without playing.

## Structure

```
src/engine/     core: AABB collision, kinematic player (6 gravity frames),
                input (keyboard/mouse, touch), save (versioned localStorage), audio (WebAudio synth: generative per-area score, footsteps, reverb)
src/gameplay/   Game simulation: observation (frustum + hysteresis), portals (seamless
                teleports), perspective (forced-scale cubes), gravity, flags/progression
src/world/      area data (pure AreaDef objects), authoring helpers, renderer (R3F)
src/ui/         HUD, touch controls, menus, settings, portfolio overlay
src/portfolio/  portfolio content, verbatim from jkvapil.cz (EN + CS)
docs/           ENGINE.md (level contract), GDD.md (design), QA.md (manual checklist, limits)
```

Design decisions: custom AABB physics instead of Rapier (the world and all six gravity
directions are axis-aligned, so a tiny deterministic solver is enough and keeps puzzles
reliable); seamless teleports instead of render-to-texture portals (zero extra render
cost on mobile); simulation state outside React (fixed 60 Hz step, one `useFrame`).

All text in the world is either game captions or portfolio content copied verbatim
from jkvapil.cz; nothing about the author is invented.
