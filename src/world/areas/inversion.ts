import { portfolio } from '../../portfolio/data'
import { b, box } from '../build'
import type { AreaDef, BoxDef, CaptionDef } from '../types'
import { raisedLine } from './monuments'

// Area 4 — The Inversion. Challenges the assumption that "down" is a fact.
//
// Rules the player can learn:
//  - A red strip is a surface that wants to be the floor. Touch it and it becomes one:
//    gravity turns, the world rolls. Things you drop fall the way you fall.
//  - The room is a ring: floor -> west wall -> ceiling. Walking "up" the red wall and
//    onto the red ceiling band puts you upside-down; touching the wall again, or walking
//    down it to the floor corner, rolls you back.
//  - The doorway in the north wall sits at ceiling level, so it is only a doorway for
//    someone standing on the ceiling. Its plug is a `seen` ghost: solid while watched.
//
// Solution:
//  1. Grab the cube (it keeps up with you), walk into the red wall strip: the wall is the
//     floor now. Walk up it; the red band along the ceiling turns you upside-down.
//  2. Drop the cube on the red ceiling plate. The plate latches `inversion:plated`
//     (persistent), so the solution survives gravity returning and the cube falling.
//  3. The ink door in the ceiling-level doorway rises (sinks, for you). Pass the plug
//     by walking in backwards (looking away). Touch the sigil mark in the chamber:
//     `sigil:inversion`, event `solve`. The plug is then gone for good.
//  4. Way home: walk to the west wall (the ceiling band leads there), step down the red
//     wall, and the floor corner restores -y. A -y net across the exit corridor is the
//     safety net: nothing leaves the area upside-down. Checkpoint sits at -y only.
//
// Secret: the dark hole in the ceiling slab (only walkable from the ceiling) drops you
// "up" into a room above the hall. Its walls carry the work history (portfolio data,
// verbatim). Seen upside-down it is unreadable; the red strip on its ceiling turns you
// upright. The hole in its floor is the way back (a long fall to the hall floor, -y).
//
// Gravity triggers never overlap in a way that re-fires: every flip leaves the player
// outside the trigger that would flip them back (triggers are entry-based, and the
// new box orientation is checked against each strip in tests/unit/inversion.test.ts).

const HOLE = { x0: 7, x1: 10, z0: -76, z1: -72 } as const
const U = { x0: -8, x1: 11, y0: 10.4, y1: 14.4, z0: -79, z1: -63 } as const

const hall: BoxDef[] = [
  b([-12.4, -0.4, -80.4], [12.4, 0, -61.6]),
  b([-12.4, 0, -80.4], [-12, 10.4, -61.6]),
  b([12, 0, -80.4], [12.4, 10.4, -61.6]),
  // South wall with the entrance gap at floor level.
  b([-12.4, 0, -62], [-1.2, 10.4, -61.6]),
  b([1.2, 0, -62], [12.4, 10.4, -61.6]),
  b([-1.2, 3, -62], [1.2, 10.4, -61.6]),
  // North wall: the gap sits at the top, 3 m below the ceiling surface.
  b([-12.4, 0, -80.4], [12.4, 7, -80]),
  b([-12.4, 7, -80.4], [-1.2, 10.4, -80]),
  b([1.2, 7, -80.4], [12.4, 10.4, -80]),
  // Ceiling slab with a hole.
  b([-12.4, 10, -80.4], [12.4, 10.4, HOLE.z0]),
  b([-12.4, 10, HOLE.z1], [12.4, 10.4, -61.6]),
  b([-12.4, 10, HOLE.z0], [HOLE.x0, 10.4, HOLE.z1]),
  b([HOLE.x1, 10, HOLE.z0], [12.4, 10.4, HOLE.z1]),
  // Ink rim around the hole so it reads as an anomaly, not a texture.
  b([HOLE.x0 - 0.2, 9.94, HOLE.z0 - 0.2], [HOLE.x0, 10, HOLE.z1 + 0.2], 'ink'),
  b([HOLE.x1, 9.94, HOLE.z0 - 0.2], [HOLE.x1 + 0.2, 10, HOLE.z1 + 0.2], 'ink'),
  b([HOLE.x0, 9.94, HOLE.z0 - 0.2], [HOLE.x1, 10, HOLE.z0], 'ink'),
  b([HOLE.x0, 9.94, HOLE.z1], [HOLE.x1, 10, HOLE.z1 + 0.2], 'ink'),
]

const corridor: BoxDef[] = [
  b([-1.6, -0.4, -61.6], [1.6, 0, -52.4]),
  b([-1.6, 3, -61.6], [1.6, 3.4, -52.4]),
  b([-1.6, 0, -61.6], [-1.2, 3, -52.4]),
  b([1.2, 0, -61.6], [1.6, 3, -52.4]),
]

// Ceiling-level chamber behind the north doorway (upside-down: floor y=10, roof y=7).
const chamber: BoxDef[] = [
  b([-3.4, 10, -92.4], [3.4, 10.4, -80.4]),
  b([-3.4, 6.6, -92.4], [3.4, 7, -80.4]),
  b([-3.4, 6.6, -92.4], [-3, 10.4, -80.4]),
  b([3, 6.6, -92.4], [3.4, 10.4, -80.4]),
  b([-3.4, 6.6, -92.4], [3.4, 10.4, -92]),
  b([-0.8, 8.1, -92], [0.8, 8.9, -91.96], 'accent', 'sigil:inversion'),
]

// The room above the hall (the secret). Its floor is the top of the ceiling slab.
const upper: BoxDef[] = [
  b([U.x0 - 0.4, U.y0, U.z0 - 0.4], [U.x0, 14.8, U.z1 + 0.4]),
  b([U.x1, U.y0, U.z0 - 0.4], [U.x1 + 0.4, 14.8, U.z1 + 0.4]),
  b([U.x0 - 0.4, U.y0, U.z0 - 0.4], [U.x1 + 0.4, 14.8, U.z0]),
  b([U.x0 - 0.4, U.y0, U.z1], [U.x1 + 0.4, 14.8, U.z1 + 0.4]),
  b([U.x0 - 0.4, U.y1, U.z0 - 0.4], [U.x1 + 0.4, 14.8, U.z1 + 0.4]),
  b([-3, 14.34, -72], [2, 14.4, -68], 'accent'),
]

// Gravity strips. West wall (-x) and the ceiling band (+y) form the ascent.
const strips: BoxDef[] = [
  b([-12, 0.5, -72], [-11.94, 10, -64], 'accent'),
  b([-12, 9.94, -72], [-5, 10, -64], 'accent'),
]

const history = (lang: 'en' | 'cs') =>
  Object.fromEntries(
    portfolio[lang].history.map((j, i) => [
      `inversion.hist${i}`,
      `${j.years} · ${j.company} · ${j.role}`,
    ]),
  )

const historyCaptions: CaptionDef[] = portfolio.en.history.map((_, i) => ({
  type: 'caption',
  id: `c-hist${i}`,
  text: `inversion.hist${i}`,
  pos: [1.5, 12.9 - i * 0.5, U.z0 + 0.03],
  size: 0.12,
}))

export const inversion: AreaDef = {
  id: 'inversion',
  bounds: box([-16.4, -5, -100], [16.4, 20, -52.4]),
  spawn: { pos: [0, 0.85, -54], yaw: 0 },
  boxes: [...corridor, ...hall, ...chamber, ...upper, ...strips],
  entities: [
    { type: 'cube', id: 'cube', pos: [3, 0.35, -70], size: 0.7 },
    {
      type: 'plate',
      id: 'plate',
      box: box([-1.5, 9.96, -72], [1.5, 10, -69]),
      minSize: 0.4,
      flag: 'inversion:plate',
      latch: 'inversion:plated',
    },
    {
      type: 'door',
      id: 'door',
      box: box([-1.2, 7, -80.4], [1.2, 10, -80.2]),
      openWhen: { any: ['inversion:plate', 'inversion:plated'] },
      mat: 'ink',
    },
    {
      type: 'ghost',
      id: 'plug',
      box: box([-1.2, 7, -80.2], [1.2, 10, -80]),
      present: 'seen',
      when: { not: 'sigil:inversion' },
    },
    { type: 'caption', id: 'c-title', text: 'inversion.fig1', pos: [0, 5.2, -79.97], size: 0.14 },
    // The chamber is read upside-down, so its lines are rolled and stacked toward the roof.
    {
      type: 'caption',
      id: 'lesson',
      text: 'inversion.lesson',
      pos: [0, 7.45, -91.97],
      roll: Math.PI,
      size: 0.2,
      style: 'display',
      when: 'sigil:inversion',
    },
    {
      type: 'caption',
      id: 'raised',
      text: 'inversion.raised',
      pos: [0, 7.85, -91.97],
      roll: Math.PI,
      size: 0.1,
      when: 'sigil:inversion',
    },
    {
      type: 'caption',
      id: 'c-wall',
      text: 'inversion.fig2',
      pos: [-11.9, 3.6, -68],
      rotY: Math.PI / 2,
      size: 0.14,
    },
    {
      type: 'caption',
      id: 'c-hist',
      text: 'inversion.histTitle',
      pos: [1.5, 13.7, U.z0 + 0.03],
      size: 0.14,
    },
    ...historyCaptions,
  ],
  triggers: [
    {
      id: 'checkpoint',
      box: box([-1.2, 0, -58], [1.2, 3, -56]),
      actions: [{ type: 'checkpoint', pos: [0, 0.85, -57], yaw: 0 }],
    },
    // Safety net: the corridor is only ever walked upright.
    {
      id: 'net',
      box: box([-1.6, 0, -61.6], [1.6, 3, -52.4]),
      actions: [{ type: 'gravity', dir: '-y' }],
    },
    // Floor -> west wall. Shallow volume: after the flip the player is outside the floor strip.
    {
      id: 'wall',
      box: box([-12, 0.6, -72], [-11.6, 10, -64]),
      actions: [{ type: 'gravity', dir: '-x' }],
    },
    // West wall top -> ceiling.
    {
      id: 'ceiling',
      box: box([-12, 9, -72], [-5, 10, -64]),
      actions: [{ type: 'gravity', dir: '+y' }],
    },
    // West wall bottom -> floor.
    {
      id: 'floor',
      box: box([-12, 0, -80], [-9, 0.3, -62]),
      actions: [{ type: 'gravity', dir: '-y' }],
    },
    // Secret room: its own red strip turns you upright.
    {
      id: 'upper-floor',
      box: box([-3, 13.6, -72], [2, 14.4, -68]),
      actions: [{ type: 'gravity', dir: '-y' }],
    },
    {
      id: 'secret',
      box: box([U.x0, U.y0, U.z0], [U.x1, U.y1, U.z1]),
      actions: [
        { type: 'flag', flag: 'secret:inversion', persist: true },
        { type: 'event', name: 'secret' },
      ],
    },
    {
      id: 'sigil',
      box: box([-3, 7, -91], [3, 10, -86]),
      when: { all: ['inversion:plated', { not: 'sigil:inversion' }] },
      actions: [
        { type: 'flag', flag: 'sigil:inversion', persist: true },
        { type: 'event', name: 'solve' },
      ],
    },
  ],
  hints: ['inversion.h1', 'inversion.h2', 'inversion.h3'],
  strings: {
    en: {
      'inversion.lesson': 'Down is wherever you decide.',
      'inversion.raised': raisedLine('experience').en,
      'inversion.fig1': 'fig. 04: every surface is a floor to someone',
      'inversion.fig2': 'fig. 04.1: red surfaces pull',
      'inversion.histTitle': portfolio.en.historyTitle,
      ...history('en'),
      'inversion.h1': 'Red surfaces want to be the floor. Walk into one.',
      'inversion.h2':
        'The red square on the ceiling wants the cube. What you drop falls the way you do.',
      'inversion.h3':
        'The ceiling doorway lets you through only while nobody watches it. Close your eyes and walk in.',
    },
    cs: {
      'inversion.lesson': 'Dole je tam, kde se rozhodneš.',
      'inversion.raised': raisedLine('experience').cs,
      'inversion.fig1': 'obr. 04: každý povrch je pro někoho podlaha',
      'inversion.fig2': 'obr. 04.1: červené plochy přitahují',
      'inversion.histTitle': portfolio.cs.historyTitle,
      ...history('cs'),
      'inversion.h1': 'Červené plochy chtějí být podlahou. Vejdi do jedné.',
      'inversion.h2':
        'Červený čtverec na stropě chce kostku. Co pustíš, padá stejným směrem jako ty.',
      'inversion.h3':
        'Průchod u stropu tě pustí, jen když se na něj nikdo nedívá. Zavři oči a projdi.',
    },
  },
}
