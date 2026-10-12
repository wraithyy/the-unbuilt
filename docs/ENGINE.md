# Engine & level authoring contract

Areas are **pure data** (`AreaDef`, `src/world/types.ts`) interpreted by generic systems
in `src/gameplay/`. Area authors touch only their own `src/world/areas/<id>.ts` and
tests. If you need an engine change, do not make it — describe it in your report.

## World facts

- Units are meters. +Y is up by default. Yaw 0 looks toward **-Z**; yaw +π/2 looks
  toward -X (yaw increases counter-clockwise seen from above).
- Everything is an **axis-aligned box** (`Box = { min, max }`). No rotation, no slopes —
  use steps (`≤ 0.42 m` rise is walked up automatically).
- Player: box 0.6 × 1.7 × 0.6, center at feet + 0.85, eye at feet + 1.47. Walk 4.2 m/s.
  Jump apex ≈ 1.15 m (so a 1.1 m ledge is jumpable, 1.3 m is not). Fixed step 60 Hz.
- Gravity is one of six axis directions (`GravityDir`). The player's box re-orients
  with it; cubes fall in the **current player gravity**.
- Static geometry: `boxes: BoxDef[]`. `mat` is `paper` (default), `surface`, `ink`,
  `accent`, `glass`. `when: Cond` makes a box exist only while the condition holds.
- **Visual language**: paper-white architecture with ink hairline edges. `accent`
  (red) is reserved for interactive or anomalous things (plates, gravity strips, door
  trims you should notice). `ink` for doors, monoliths, voids.

## Areas and regions

Each area has `bounds`. Being outside every area's bounds for 1.2 s respawns the
player at the last checkpoint (safety net against falling out). So **bounds must
contain every reachable point of your area** and must **not overlap other areas**
(the first match wins, see `src/world/areas/index.ts`).

Regions reserved by the Atrium doorways (gap 2.4 m wide, 3 m tall, floor y = 0):

| Area | Region | Doorway in Atrium wall |
|---|---|---|
| loop | x < -16.4 (use x ∈ [-120, -16.4]) | x = -16.4..-16, z = -33.2..-30.8 |
| perspective | x > 16.4 (use x ∈ [16.4, 120]) | x = 16..16.4, z = -33.2..-30.8 |
| inversion | z < -52.4, x ∈ [-60, 60] (keep z > -150) | z = -52.4..-52, x = -1.2..1.2 |
| convergence | z ∈ [-300, -160] | reached through the Atrium core |

Keep regions within y ∈ [-30, 40]. Your geometry must connect to the doorway gap
(floor top y = 0 at the doorway). The player returns to the Atrium through the same
doorway (or any route you design that ends there).

## Entities (`entities: EntityDef[]`)

- `cube` — box of edge `size`. Grab/drop with the action button (soft-aim cone, no
  pixel aiming). `scalable: true` = forced perspective: while held it keeps its
  apparent size; it is pushed along the view ray as far as it fits and its size becomes
  `ratio × distance`, clamped to **0.25 … 4**. `creep: { path, speed }` = moves along the
  path only while not in the camera frustum, then becomes a normal cube. Cubes are
  solid for the player (you can stand on them). Only **held** cubes travel through
  teleports; others stay where they are.
- `plate` — thin non-solid slab lying on a surface (e.g. 0.04 thick). Pressed while a
  cube (≥ `minSize`) overlaps it, or the player when `accepts: 'any'`. Sets `flag`
  (default `"<areaId>.<id>"`) while pressed; `latch` sets a **persistent** flag on first
  press (use it for "solved" so the puzzle stays solved after reload).
- `door` — solid box that slides up while `openWhen` holds. Never closes onto the
  player or a cube.
- `ghost` — observation-dependent box. `present: 'seen'` exists only while inside the
  camera frustum; `'unseen'` only while outside. Changes need 0.15 s of stable
  observation and **never happen while the player or a cube occupies the volume** (no
  traps); leaning on a ghost from the side does not pin it, only standing on it does.
  Absent `unseen` ghosts are drawn as a dashed wireframe (a learnable tell). With the
  player's eyes closed (`Game.eyesClosed`) nothing counts as seen.
  Frustum only — walls do not occlude observation; design sightlines accordingly.
- `align` — forced-perspective bridge. `fragments` (static boxes) are always drawn;
  the solid `box` exists while the player's eye is within `vantage.radius` of
  `vantage.pos` and looks within `coneDeg` of `vantage.lookAt`, and stays while
  occupied. Sets `flag` (default `"<areaId>.<id>"`) while solid.
- `anamorph` — portfolio monument (see `src/world/areas/monuments.ts`): text panel cut into
  shards along the rays from `vantage`; reading it from there sets `read:<id>` (persisted),
  emits `custom` `read:<section>`, then the shards assemble.
- `caption` — in-world text plane (faces +Z; `rotY` rotates it). `text` is a key into
  your `strings`. `style: 'fig'` (mono, default, 0.16 m) or `'display'` (serif).

## Triggers (`triggers: TriggerDef[]`)

Fire when the player's box **enters** `box` (and `when` holds, and, if `dir` is set,
the velocity points along `dir`). `once: true` fires once until the area is reset.
Actions:

- `teleport { from, to, rotY? }` — `p' = to + rotY(p - from)`. Rotates yaw, velocity and
  frame too. **Seamless rule**: geometry around `from` and around `to` must be identical
  within view distance, so the jump is invisible. Do not place the destination inside
  another teleport trigger (it would not fire anyway, but it confuses players).
- `flag { flag, value?, persist? }` — persistent flags survive reloads and resets.
- `checkpoint { pos, yaw }` — respawn point (stores current gravity).
- `gravity { dir }` — rolls the camera over 0.6 s (instant with reduced motion).
  **Any area that changes gravity must restore `'-y'` before the player can leave it.**
- `event { name }` — emitted to audio/UI as `{ name: 'custom', id: name }`.
  Use `solve` when a puzzle is solved and `secret` when a secret is found.
- `ending` — finishes the game.

## Flags and progression

- Namespace flags as `<areaId>:<name>`.
- Solving an area must set its **sigil** persistently:
  `sigil:loop`, `sigil:perspective`, `sigil:inversion` (see `SIGILS` in
  `src/gameplay/progression.ts`). All three open the Atrium core.
- Secrets set `secret:<areaId>` persistently.
- Conditions (`Cond`): a flag name, `{ all: [...] }`, `{ any: [...] }`, `{ not: c }`.

## Strings and hints

`strings: { en, cs }` hold every caption/hint text of your area. Keys are namespaced
(`loop.fig1`). Captions use the site's figure style: EN `fig. 02 — …`, CS `obr. 02 — …`.
Keep words scarce — discovery over explanation. `hints` are 2–3 keys, from gentle nudge
to near-solution, shown on demand from the pause menu.

## Portfolio content in secrets

Secret rooms may show portfolio content **only** from `src/portfolio/data.ts`
(verbatim from jkvapil.cz). Import it and build your `strings` from it. Never invent
projects, numbers or claims.

## Authoring helpers (`src/world/build.ts`)

- `b(min, max, mat?, when?)` → `BoxDef`; `box(min, max)` → `Box`.
- `hollow(min, max, { t, gaps, floor, ceiling, mat })` — room around an interior box with
  door gaps (`{ side: 'n'|'s'|'e'|'w', at, width, height }`; n = -Z wall, e = +X wall).
- `frame(side, face, at, width, height, y0?, mat?)` — door trim on a wall face.

## Testing

- Unit: `tests/unit/helpers.ts` gives `room()`, `camera()`, `run(game, seconds, move)`,
  `tap(game)` (one interact press). Build `new Game([yourArea])`, script inputs, assert
  flags. Direct state pokes are fine for setup: `g.warp(pos, yaw)`,
  `g.player.yaw/pitch = …`.
- Every area needs a **scripted solve test** proving the solution works with the real
  sim (walk, look, grab, drop) and a test that a reset restores the puzzle.
- Browser: dev server `pnpm dev`; with `?debug` the game is `window.__unbuilt`
  (`Game` instance). `scripts/arrival.mjs` is an example headless Playwright run.
