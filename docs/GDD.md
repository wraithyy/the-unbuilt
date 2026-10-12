# The Unbuilt — design notes

Antichamber-first: the player learns the world's rules by touching them. One accent
colour (the site's red) marks everything interactive or anomalous; paper-white brutalist
volumes with ink hairlines borrow the jkvapil.cz "fig. NN — wireframe, no fill" motif.

## Core loop

Notice an anomaly → experiment → infer the rule → use it on a puzzle → the rule returns
later combined with another. No quest markers; captions are numbered figures, hints are
opt-in from the pause menu (gentle → near-solution).

## Mechanics

| | Rule | Taught in |
|---|---|---|
| O — Observation | some geometry exists only while watched / only while unwatched; some things move only when unwatched | Arrival |
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
2. **Loop** — a periodic corridor; each lap flips parity (vaults open on odd laps). Take the
   cube, place it on a plate hidden behind a watched-only wall to anchor the corridor.
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
