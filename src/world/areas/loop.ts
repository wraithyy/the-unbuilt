import { portfolio } from '../../portfolio/data'
import { b, box, frame } from '../build'
import type { AreaDef, BoxDef, Cond, EntityDef, TriggerDef, Vec3 } from '../types'

// Area 2 — The Loop. A slalom corridor of identical 10 m bays. Walking west through the far
// end teleports you 10 m back east (seamless: the corridor is periodic), and every such
// lap flips a parity flag `loop:odd`.
//
// Rule (learnable by walking two laps):
//   * Ink vault doors in the south wall are open only on ODD passes. One vault (bay 1)
//     holds the cube.
//   * The plate niche in the north wall is hidden by a ghost wall that exists only while
//     watched. The plate lives in bay 1, just before the far-end jump.
//   * A cube resting on the plate sets `loop:anchor`: the far-end jump stops firing and the
//     ink door at the end of the corridor opens.
// Solution: walk one lap (parity becomes odd, vaults open), take the cube from the vault,
// turn your back on the plate niche (look along the corridor and strafe in), drop the cube
// in it, then walk on through the anchored far end into the chamber: `sigil:loop`.
// The way home is the corridor itself (the anchor holds while the cube stays on the plate).
//
// Secret: on an odd pass the way back east is a loop too. Walking east through the
// backward trigger three times in a row (without a forward lap in between) drops you into
// `fig. 07 — capabilities`. Its exit teleports back to the vestibule.
//
// Geometry: u = metres west of the Atrium doorway, x = -16.4 - u. Corridor z in
// [-33.2, -30.8], 3 m tall.

const X0 = -16.4
const x = (u: number) => X0 - u
const FIRST = 6
const PERIOD = 10
const BAYS = 4
const U_END = 51.8
const MOUTH = 1.8
const ODD = 'loop:odd'
const ANCHOR = 'loop:anchor'

const ub = (u0: number, u1: number, z0: number, z1: number, y0: number, y1: number, mat?: 'ink') =>
  b([x(u1), y0, z0], [x(u0), y1, z1], mat)

const bayU = (k: number) => FIRST + PERIOD * k
// Vault (south) and plate niche (north) mouths inside bay k.
const vaultU = (k: number) => bayU(k) + 1.6
const nicheU = (k: number) => bayU(k) + 6.2
// The cube sits in bay 1's vault; the plate in bay 1's niche (just before the jump).
const CUBE_BAY = 1
const S_LO = bayU(2) - 1.0
// Backward trigger sits just east of the landing point; it must land clear of the forward one.
const R_HI = bayU(1) - 1.8

/** Cavity behind a wall mouth: floor, ceiling, back wall and two jambs. */
function cavity(side: 'n' | 's', u0: number): BoxDef[] {
  const u1 = u0 + MOUTH
  const zr = (d0: number, d1: number): [number, number] =>
    side === 'n' ? [-33.2 - d1, -33.2 - d0] : [-30.8 + d0, -30.8 + d1]
  const [f0, f1] = zr(0.4, 2.4)
  const [k0, k1] = zr(2.2, 2.4)
  const [j0, j1] = zr(0.4, 2.2)
  return [
    ub(u0 - 0.2, u1 + 0.2, f0, f1, -0.4, 0),
    ub(u0 - 0.2, u1 + 0.2, f0, f1, 3, 3.4),
    ub(u0 - 0.2, u1 + 0.2, k0, k1, 0, 3),
    ub(u0 - 0.2, u0, j0, j1, 0, 3),
    ub(u1, u1 + 0.2, j0, j1, 0, 3),
  ]
}

/** A wall of the corridor with mouths cut out. */
function wall(z0: number, z1: number, mouths: number[]): BoxDef[] {
  const out: BoxDef[] = []
  let cur = 0
  for (const m of mouths) {
    out.push(ub(cur, m, z0, z1, 0, 3))
    cur = m + MOUTH
  }
  out.push(ub(cur, U_END, z0, z1, 0, 3))
  return out
}

const vaults = Array.from({ length: BAYS }, (_, k) => vaultU(k))
const niches = Array.from({ length: BAYS }, (_, k) => nicheU(k))

const corridor: BoxDef[] = [
  ub(0, U_END, -33.6, -30.4, -0.4, 0),
  ub(0, U_END, -33.6, -30.4, 3, 3.4),
  ub(51.4, U_END, -33.6, -30.4, 0, 3),
  ...wall(-33.6, -33.2, niches),
  ...wall(-30.8, -30.4, vaults),
]

// Staggered baffles: they break sightlines so the seam of the loop is never visible, and
// they make the corridor read as one repeating rhythm.
const baffles: BoxDef[] = []
const mouths: BoxDef[] = []
for (let k = 0; k < BAYS; k++) {
  const u = bayU(k)
  baffles.push(ub(u, u + 0.4, -33.2, -32, 0, 3), ub(u + 5, u + 5.4, -32, -30.8, 0, 3))
  baffles.push(...cavity('s', vaultU(k)), ...cavity('n', nicheU(k)))
  mouths.push(
    ...frame('s', -30.8, x(vaultU(k) + MOUTH / 2), MOUTH, 3),
    ...frame('n', -33.2, x(nicheU(k) + MOUTH / 2), MOUTH, 3),
  )
}

// ---------------------------------------------------------------- secret room
const SEC_X: [number, number] = [-102, -86]
const SEC_Z: [number, number] = [-36, -30]
const secretRoom: BoxDef[] = [
  ...hollow3(),
  // Accent frame marks the way back (west wall, behind the player on arrival).
  ...frame('w', SEC_X[0], -33, 1.0, 2.4, 0, 'accent'),
]

function hollow3(): BoxDef[] {
  const t = 0.4
  const [x0, x1] = SEC_X
  const [z0, z1] = SEC_Z
  return [
    b([x0 - t, -t, z0 - t], [x1 + t, 0, z1 + t]),
    b([x0 - t, 3.4, z0 - t], [x1 + t, 3.4 + t, z1 + t]),
    b([x0 - t, 0, z0 - t], [x1 + t, 3.4, z0]),
    b([x0 - t, 0, z1], [x1 + t, 3.4, z1 + t]),
    b([x0 - t, 0, z0], [x0, 3.4, z1]),
    b([x1, 0, z0], [x1 + t, 3.4, z1]),
  ]
}

// ---------------------------------------------------------------- entities
const entities: EntityDef[] = []
for (let k = 0; k < BAYS; k++) {
  const v = vaultU(k)
  entities.push(
    {
      type: 'door',
      id: `vault${k}`,
      box: ub(v, v + MOUTH, -30.8, -30.4, 0, 3, 'ink'),
      openWhen: ODD,
      mat: 'ink',
    },
    {
      type: 'ghost',
      id: `wall${k}`,
      box: ub(nicheU(k), nicheU(k) + MOUTH, -33.6, -33.2, 0, 3),
      present: 'seen',
    },
  )
}
const cubeX = x(vaultU(CUBE_BAY) + MOUTH / 2)
const plateX = x(nicheU(CUBE_BAY) + MOUTH / 2)
entities.push(
  { type: 'cube', id: 'cube', pos: [cubeX, 0.3, -29.5], size: 0.6 },
  {
    type: 'plate',
    id: 'anchor',
    box: box([plateX - 0.6, 0, -35.2], [plateX + 0.6, 0.04, -33.7]),
    flag: ANCHOR,
  },
  {
    type: 'door',
    id: 'end',
    box: ub(45, 45.4, -33.2, -30.8, 0, 3, 'ink'),
    openWhen: ANCHOR,
    mat: 'ink',
  },
  { type: 'caption', id: 'fig1', text: 'loop.fig1', pos: [x(3.5), 1.7, -33.17], size: 0.14 },
  {
    type: 'caption',
    id: 'fig2',
    text: 'loop.fig2',
    pos: [x(51.37), 1.7, -32],
    rotY: Math.PI / 2,
    size: 0.14,
  },
)

// Secret captions: capability title + delivered line, N and S walls.
const SEC_ZC = (SEC_Z[0] + SEC_Z[1]) / 2
const SEC_XC = (SEC_X[0] + SEC_X[1]) / 2
const slots: { x: number; z: number; rotY: number }[] = [
  { x: SEC_XC - 3.5, z: SEC_Z[0] + 0.03, rotY: 0 },
  { x: SEC_XC + 3.5, z: SEC_Z[0] + 0.03, rotY: 0 },
  { x: SEC_XC - 3.5, z: SEC_Z[1] - 0.03, rotY: Math.PI },
  { x: SEC_XC + 3.5, z: SEC_Z[1] - 0.03, rotY: Math.PI },
]
slots.forEach((s, i) => {
  entities.push(
    {
      type: 'caption',
      id: `st${i}`,
      text: `loop.sec.t${i}`,
      pos: [s.x, 2.3, s.z],
      rotY: s.rotY,
      size: 0.22,
    },
    {
      type: 'caption',
      id: `sd${i}`,
      text: `loop.sec.d${i}`,
      pos: [s.x, 1.9, s.z],
      rotY: s.rotY,
      size: 0.1,
    },
  )
})
entities.push({
  type: 'caption',
  id: 'sfig',
  text: 'loop.sec.fig',
  pos: [SEC_X[1] - 0.03, 1.7, SEC_ZC],
  rotY: -Math.PI / 2,
  size: 0.22,
})

// ---------------------------------------------------------------- triggers
const SPAN = (lo: number, hi: number) => box([x(hi), 0, -33.2], [x(lo), 3, -30.8])
const notOdd: Cond = { not: ODD }
const free: Cond = { not: ANCHOR }
const clearBack = [
  { type: 'flag', flag: 'loop:b1', value: false },
  { type: 'flag', flag: 'loop:b2', value: false },
] as const
const FWD: Vec3 = [-1, 0, 0]
const BACK: Vec3 = [1, 0, 0]

const triggers: TriggerDef[] = [
  {
    id: 'checkpoint',
    box: SPAN(2.4, 2.8),
    once: true,
    actions: [{ type: 'checkpoint', pos: [x(3), 0.85, -32], yaw: Math.PI / 2 }],
  },
  // Far end: jump 10 m back east and flip the parity.
  {
    id: 'lap-even',
    box: SPAN(S_LO, S_LO + 0.4),
    dir: FWD,
    when: { all: [notOdd, free] },
    actions: [
      { type: 'teleport', from: [0, 0, 0], to: [PERIOD, 0, 0] },
      { type: 'flag', flag: ODD },
      ...clearBack,
    ],
  },
  {
    id: 'lap-odd',
    box: SPAN(S_LO, S_LO + 0.4),
    dir: FWD,
    when: { all: [ODD, free] },
    actions: [
      { type: 'teleport', from: [0, 0, 0], to: [PERIOD, 0, 0] },
      { type: 'flag', flag: ODD, value: false },
      ...clearBack,
    ],
  },
  // Backward: on an odd pass the way home loops too; three times in a row opens the secret.
  {
    id: 'back1',
    box: SPAN(R_HI - 0.4, R_HI),
    dir: BACK,
    when: { all: [ODD, free, { not: 'loop:b1' }] },
    actions: [
      { type: 'teleport', from: [0, 0, 0], to: [-PERIOD, 0, 0] },
      { type: 'flag', flag: 'loop:b1' },
    ],
  },
  {
    id: 'back2',
    box: SPAN(R_HI - 0.4, R_HI),
    dir: BACK,
    when: { all: [ODD, free, 'loop:b1', { not: 'loop:b2' }] },
    actions: [
      { type: 'teleport', from: [0, 0, 0], to: [-PERIOD, 0, 0] },
      { type: 'flag', flag: 'loop:b2' },
    ],
  },
  {
    id: 'back3',
    box: SPAN(R_HI - 0.4, R_HI),
    dir: BACK,
    when: { all: [ODD, free, 'loop:b1', 'loop:b2'] },
    actions: [
      { type: 'teleport', from: [x(R_HI), 0, -32], to: [-96, 0, -33] },
      { type: 'flag', flag: 'secret:loop', persist: true },
      { type: 'event', name: 'secret' },
    ],
  },
  {
    id: 'secret-exit',
    box: box([-102, 0, -33.5], [-101.4, 3.4, -32.5]),
    dir: FWD,
    actions: [
      { type: 'teleport', from: [-101.7, 0, -33], to: [x(3), 0, -32] },
      { type: 'flag', flag: ODD, value: false },
      ...clearBack,
    ],
  },
  {
    id: 'solve',
    box: SPAN(47, 50),
    when: { not: 'sigil:loop' },
    actions: [
      { type: 'flag', flag: 'sigil:loop', persist: true },
      { type: 'event', name: 'solve' },
    ],
  },
]

const sec = (lang: 'en' | 'cs') =>
  Object.fromEntries(
    portfolio[lang].capabilities.flatMap((c, i) => [
      [`loop.sec.t${i}`, c.title],
      [`loop.sec.d${i}`, c.delivered],
    ]),
  )

export const loop: AreaDef = {
  id: 'loop',
  bounds: box([-120, -30, -70], [-16.4, 40, 10]),
  spawn: { pos: [-18, 0.85, -32], yaw: Math.PI / 2 },
  boxes: [...corridor, ...baffles, ...mouths, ...secretRoom],
  entities,
  triggers,
  hints: ['loop.h1', 'loop.h2', 'loop.h3'],
  strings: {
    en: {
      'loop.fig1': 'fig. 02 — you have been here',
      'loop.fig2': 'fig. 02 — fixed point',
      'loop.sec.fig': 'fig. 07 — capabilities',
      'loop.h1': 'Keep walking. Note what repeats, and what does not.',
      'loop.h2': 'An ink door in the wall opens only on every other pass.',
      'loop.h3':
        'The door gives up something you can carry round the loop. A wall that exists only while watched hides where it belongs.',
      ...sec('en'),
    },
    cs: {
      'loop.fig1': 'obr. 02 — už jsi tu byl',
      'loop.fig2': 'obr. 02 — pevný bod',
      'loop.sec.fig': 'obr. 07 — schopnosti',
      'loop.h1': 'Jdi dál. Všimni si, co se opakuje a co ne.',
      'loop.h2': 'Inkoustové dveře ve zdi se otevřou jen při každém druhém průchodu.',
      'loop.h3':
        'Dveře vydají něco, co můžeš nést dokola. Zeď, která existuje jen pod pohledem, skrývá místo, kam to patří.',
      ...sec('cs'),
    },
  },
}
