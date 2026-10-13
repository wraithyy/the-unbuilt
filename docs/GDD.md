# The Unbuilt — design notes

Antichamber-first: the player learns the world's rules by touching them. One accent
colour (the site's red) marks everything interactive or anomalous; paper-white brutalist
volumes with ink hairlines borrow the jkvapil.cz "fig. NN: wireframe, no fill" motif.

## Core loop

Notice an anomaly → experiment → infer the rule → use it on a puzzle → the rule returns
later combined with another. No quest markers; captions are numbered figures, hints are
opt-in from the pause menu (gentle → near-solution).

## Mechanics

| | Rule | Taught in |
|---|---|---|
| O — Observation | some geometry exists only while watched / only while unwatched; some things move only when unwatched. Closing your eyes (Q / eye button) makes nothing watched and shows the world as a light blueprint — you never have to walk backwards | Arrival |
| L — Topology | corridors repeat; inside can be larger than outside; direction of travel matters | Loop, Convergence |
| P — Perspective | a held cube keeps its apparent size; placed far it grows, near it shrinks; fragments align from one viewpoint | Perspective |
| G — Gravity | red strips make their surface the floor; dropped things fall your way | Inversion |
| E — Physical | cubes, plates (latched when solved), doors | everywhere |

## World graph

```
Arrival ──► Atrium (hub) ──► Loop ─────────┐
                 │      ├──► Perspective ──┼─► 3 sigils open the core
                 │      └──► Inversion ────┘
                 └── core ──► Convergence ──► The Unbuilt (ending)
```

Areas 2–4 in any order; each returns to the Atrium. Each holds one secret with portfolio
content (capabilities, stack, work history).

## Areas

1. **Arrival** — a door drawn on a wall is a wall only while seen: walk through it backwards.
   A cube crosses the next room to a plate only while nobody watches. (O)
2. **Loop** — a periodic corridor; each lap flips parity (glass vaults open on odd laps; the
   wall caption alternates "you have been here" / "...before" so the repeat is readable).
   Take the cube, close your eyes at the red-framed niche (the Arrival motif) and place it
   on the plate behind the watched-only wall to anchor the corridor.
   Secret: three backward laps. (L + O + E)
3. **Perspective** — grow a cube by placing it far away to press a strip; size one to climb
   a ledge; stand on the vantage square so floating fragments become a bridge. Secret: a
   cube small enough for a niche behind a slot. (P + O + E)
4. **Inversion** — carry a cube up a wall onto the ceiling, place it on a ceiling plate, back
   through a watched-only plug into a ceiling-level doorway. Secret above the ceiling. (G + O + E)
5. **Convergence** — the core is larger inside; a stair exists only unwatched; a seed cube
   grown from afar opens a tower; inside it you fall up; the oculus is sealed only while
   watched — fall through it. (L + O + P + G)
6. **The Unbuilt** — a colonnade built only while nobody looks; the author's name is the far
   wall; the plinth ends the game and opens the portfolio.

## Budgets (measured, see QA.md)

Draw calls < 150 per view, JS < 600 kB gzip, no post-processing, one shadow light
(off on Low), adaptive DPR.

## Visual direction

- **Built where you look.** Static architecture is filled only near the player and toward
  the centre of vision; with distance and at the edge of sight it dissolves cell by cell
  (red seam) into its wireframe. Interactive objects never dissolve.
- **The void.** Paper-white architecture floats in near-black space: an inverted Atrium
  turns overhead, Penrose stair rings circle the hub, a Penrose triangle closes only from
  the Atrium entrance, dust drifts upward.
- **Eyes closed.** All fill disappears; every edge becomes a light line; sight shrinks to a
  few metres. You see the world as it is when nobody watches.

## Portfolio in the world

Anamorphic monuments: each portfolio chapter is a panel cut into shards scattered along
the rays from one vantage (a red floor square). From there the shards line up into
readable text; reading it records the chapter (overlay marks it "found in the world",
a toast links straight to it) and the shards then assemble permanently.

| Chapter | Where | Appears |
|---|---|---|
| About | Atrium entrance | always |
| Capabilities | Atrium, north-west | after Loop |
| Stack | Atrium, north-east | after Perspective |
| Experience | Atrium, looking back south | after Inversion |
| Contact | The Unbuilt (ending room) | at the end |

The conventional overlay keeps every chapter reachable at any time.
