import { portfolio } from '../../portfolio/data'
import { b, box } from '../build'
import type { AreaDef, BoxDef, Vec3 } from '../types'
import { raisedLine } from './monuments'

// Area 3 — The Perspective. Teaches scale (E + P) and alignment (O).
//
// Route (everything is axis-aligned; +x east, -z north):
//   Hall 1 (x 16.4..32, z -36..-28): a cube (0.5 m, scalable) and a red floor strip at the
//     far end that only counts a cube >= 1.2 m. Held, a scalable cube keeps its apparent size
//     and is pushed along the view ray to the first wall: aim down the hall, drop it, and it
//     lands far away and BIG, on the strip. That opens the door in the north wall (latched).
//   Hall 2 (x 17..29, z -66..-36.4): a 1.6 m ledge is out of reach (jump apex ~1.15 m).
//     Place the cube against the ledge face from 3.5-6.3 m away (ratio ~0.19) and it becomes
//     0.6-1.1 m: jump onto it, then onto the ledge. Too big (aim from far) or too small
//     (aim from close) -> grab it again (up close it shrinks) and retry.
//   Chasm (z -59.5..-50): 4 m deep with a staircase back up to the ledge, so nothing is lost
//     by falling. Far platform beyond is 9.5 m away; the 4 m max cube cannot bridge it.
//     From the red square on the ledge edge (eye = vantage) the floating slabs above the
//     gap project exactly onto one deck: the `align` deck becomes solid while the eye is
//     within 0.8 m of the vantage and looking down the gap (16 deg cone), and stays solid
//     while occupied. Fragments are scaled copies of the deck about the vantage eye, so
//     they line up perfectly from there and look scattered from everywhere else.
//     Reaching the far platform sets sigil:perspective, emits `solve`, and leaves a solid
//     deck behind (flag-gated) so the way back is easy.
//   Secret: a 0.5 m wide slot in the east wall shows a red plate in a 1.2 m niche. The
//     held cube is placed at the end of the view ray, so aiming through the window with a
//     cube whose ratio is small (grabbed from >= 2.5 m, or placed close and re-grabbed) puts
//     it inside the niche on the plate; a bigger one does not fit and lands in front of the
//     wall. The plate opens a door in the ledge's east wall to a hidden room that lists the stack from the portfolio.
//     The cube can be grabbed back through the window.

const T = 0.4
const X0 = 16.4
const LEDGE = 1.6
const PIT = -2.4

const wallEast = (
  x0: number,
  x1: number,
  za: number,
  zb: number,
  ya: number,
  yb: number,
  holes: { z0: number; z1: number; y0: number; y1: number }[],
): BoxDef[] => {
  const out: BoxDef[] = []
  let z = za
  for (const h of [...holes].sort((p, q) => p.z0 - q.z0)) {
    out.push(b([x0, ya, z], [x1, yb, h.z0]))
    out.push(b([x0, ya, h.z0], [x1, h.y0, h.z1]))
    out.push(b([x0, h.y1, h.z0], [x1, yb, h.z1]))
    z = h.z1
  }
  out.push(b([x0, ya, z], [x1, yb, zb]))
  return out
}

// Deck of the forced-perspective bridge and the eye it is lined up from.
const DECK = { x0: 21.8, x1: 24.2, y0: LEDGE - 0.2, y1: LEDGE, z0: -59.5, z1: -50 }
const EYE: Vec3 = [23, LEDGE + 1.47, -49]

const scaleAbout = (min: Vec3, max: Vec3, k: number): BoxDef => {
  const at = (v: Vec3): Vec3 => [
    EYE[0] + k * (v[0] - EYE[0]),
    EYE[1] + k * (v[1] - EYE[1]),
    EYE[2] + k * (v[2] - EYE[2]),
  ]
  return b(at(min), at(max))
}

const fragments: BoxDef[] = [
  scaleAbout([DECK.x0, DECK.y0, -53.2], [DECK.x1, DECK.y1, -50], 0.55),
  scaleAbout([DECK.x0, DECK.y0, -56.4], [DECK.x1, DECK.y1, -53.2], 0.8),
  scaleAbout([DECK.x0, DECK.y0, DECK.z0], [DECK.x1, DECK.y1, -56.4], 1),
]

const stairs: BoxDef[] = Array.from({ length: 10 }, (_, j) =>
  b([29 - 1.2 * (j + 1), PIT, -52], [29 - 1.2 * j, PIT + 0.4 * (j + 1), -50], 'surface'),
)

const stack = (l: 'en' | 'cs') => portfolio[l].stack.map((s) => `${s.label}: ${s.items}`)
const stackEn = stack('en')
const stackCs = stack('cs')

export const perspective: AreaDef = {
  id: 'perspective',
  bounds: box([X0, -6, -67], [41, 12, -27]),
  spawn: { pos: [18, 0.85, -32], yaw: -Math.PI / 2 },
  boxes: [
    // Hall 1: floor, ceiling, south and east walls, north wall with a door gap.
    b([X0, -T, -36.4], [32.4, 0, -27.6]),
    b([X0, 6, -36.4], [32.4, 6 + T, -27.6]),
    b([X0, 0, -27.6 - T], [32.4, 6, -27.6]),
    b([32, 0, -36.4], [32.4, 6, -27.6]),
    b([X0, 0, -36.4], [20, 7.4, -36]),
    b([22.4, 0, -36.4], [32.4, 7.4, -36]),
    b([20, 3, -36.4], [22.4, 7.4, -36]),
    b([32, 6, -36.4], [32.4, 7.4, -36]),
    // Hall 2 + chasm hall: floor, ledge, pit, far platform, shell.
    b([X0, -T, -44], [29.4, 0, -36.4]),
    b([X0, -T, -50], [29.4, LEDGE, -44]),
    b([X0, PIT - T, -59.5], [29.4, PIT, -50]),
    b([X0, PIT - T, -66.4], [29.4, LEDGE, -59.5]),
    b([X0, PIT - T, -66.4], [17, 7.4, -36.4]),
    b([X0, PIT - T, -66.4], [29.4, 7.4, -66]),
    b([X0, 7, -66.4], [29.4, 7.4, -36.4]),
    ...wallEast(29, 29.4, -66.4, -36.4, PIT - T, 7.4, [
      { z0: -48.6, z1: -46.2, y0: LEDGE, y1: LEDGE + 3 }, // secret door, ledge level
      { z0: -41.25, z1: -40.75, y0: 0.3, y1: 1.3 }, // window onto the plate niche
    ]),
    ...stairs,
    // The red square: stand here. Looks like a floor tile, nothing more.
    b([22.55, LEDGE, -49.45], [23.45, LEDGE + 0.02, -48.55], 'accent'),
    // Far platform: an ink plinth carrying the sigil.
    b([22.5, LEDGE, -65.2], [23.5, 3, -64.2], 'ink'),
    b([22.8, 2, -64.18], [23.2, 2.4, -64.14], 'accent'),
    // The finished bridge, kept once solved (fragments stay drawn; harmless).
    b([DECK.x0, DECK.y0, DECK.z0], [DECK.x1, DECK.y1, DECK.z1], undefined, 'sigil:perspective'),
    // Niche behind the window (interior x 29.4..30.6, z -41.6..-40.4, y 0..2).
    b([29.4, -T, -42.2], [31.2, 0, -39.8]),
    b([29.4, 2, -42.2], [31.2, 2.6, -39.8]),
    b([30.6, 0, -42.2], [31.2, 2, -39.8]),
    b([29.4, 0, -42.2], [30.6, 2, -41.6]),
    b([29.4, 0, -40.4], [30.6, 2, -39.8]),
    // Secret room at ledge level (interior x 29.4..40, z -51..-43); its west wall is the hall's.
    b([29.4, -T, -51.4], [40.4, LEDGE, -42.6]),
    b([29.4, LEDGE + 3.2, -51.4], [40.4, LEDGE + 3.6, -42.6]),
    b([29.4, LEDGE, -43], [40.4, LEDGE + 3.2, -42.6]),
    b([29.4, LEDGE, -51.4], [40.4, LEDGE + 3.2, -51]),
    b([40, LEDGE, -51], [40.4, LEDGE + 3.2, -43]),
  ],
  entities: [
    { type: 'cube', id: 'cube', pos: [19, 0.25, -32], size: 0.5, scalable: true },
    {
      type: 'plate',
      id: 'strip',
      box: box([25.5, 0, -36], [32, 0.04, -28]),
      minSize: 1.2,
      flag: 'perspective:strip',
      latch: 'perspective:strip-done',
    },
    {
      type: 'door',
      id: 'north',
      box: box([20, 0, -36.4], [22.4, 3, -36]),
      openWhen: { any: ['perspective:strip', 'perspective:strip-done'] },
      mat: 'ink',
    },
    {
      type: 'align',
      id: 'bridge',
      box: box([DECK.x0, DECK.y0, DECK.z0], [DECK.x1, DECK.y1, DECK.z1]),
      fragments,
      vantage: { pos: EYE, radius: 0.8, lookAt: [23, LEDGE, -55], coneDeg: 16 },
      flag: 'perspective:bridge',
    },
    {
      type: 'plate',
      id: 'niche',
      box: box([29.4, 0, -41.6], [30.6, 0.04, -40.4]),
      minSize: 0.2,
      flag: 'perspective:niche',
      latch: 'perspective:niche-done',
    },
    {
      type: 'door',
      id: 'secret',
      box: box([29, LEDGE, -48.6], [29.4, LEDGE + 3, -46.2]),
      openWhen: { any: ['perspective:niche', 'perspective:niche-done'] },
      mat: 'surface',
    },
    {
      type: 'caption',
      id: 'c1',
      text: 'perspective.fig1',
      pos: [31.97, 2.4, -32],
      rotY: -Math.PI / 2,
      size: 0.14,
    },
    {
      type: 'caption',
      id: 'c2',
      text: 'perspective.fig2',
      pos: [17.03, 2.6, -48],
      rotY: Math.PI / 2,
      size: 0.14,
    },
    {
      type: 'caption',
      id: 'c3',
      text: 'perspective.fig3',
      pos: [28.97, 2.2, -41],
      rotY: -Math.PI / 2,
      size: 0.12,
    },
    // Over the plinth on the far platform, once reached.
    {
      type: 'caption',
      id: 'lesson',
      text: 'perspective.lesson',
      pos: [23, 4.4, -65.97],
      size: 0.24,
      style: 'display',
      when: 'sigil:perspective',
    },
    {
      type: 'caption',
      id: 'raised',
      text: 'perspective.raised',
      pos: [23, 3.75, -65.97],
      size: 0.12,
      when: 'sigil:perspective',
    },
    ...[0, 1, 2].map((i): AreaDef['entities'][number] => ({
      type: 'caption',
      id: `stack${i}`,
      text: `perspective.stack${i}`,
      pos: [39.97, LEDGE + 2.1 - i * 0.5, -47],
      rotY: -Math.PI / 2,
      size: 0.1,
    })),
  ],
  triggers: [
    {
      id: 'start',
      box: box([X0, 0, -36], [18.5, 3, -28]),
      actions: [{ type: 'checkpoint', pos: [18, 0.85, -32], yaw: -Math.PI / 2 }],
    },
    {
      id: 'ledge',
      box: box([17, LEDGE, -49.9], [29, LEDGE + 2, -44.2]),
      actions: [{ type: 'checkpoint', pos: [23, LEDGE + 0.85, -46.5], yaw: 0 }],
    },
    {
      id: 'sigil',
      box: box([21, LEDGE, -63.5], [25, LEDGE + 2.5, -60.5]),
      actions: [
        { type: 'flag', flag: 'sigil:perspective', persist: true },
        { type: 'checkpoint', pos: [23, LEDGE + 0.85, -62], yaw: 0 },
        { type: 'event', name: 'solve' },
      ],
    },
    {
      id: 'hidden',
      box: box([31, LEDGE, -51], [40, LEDGE + 3, -43]),
      actions: [
        { type: 'flag', flag: 'secret:perspective', persist: true },
        { type: 'event', name: 'secret' },
      ],
    },
  ],
  hints: ['perspective.h1', 'perspective.h2', 'perspective.h3'],
  strings: {
    en: {
      'perspective.lesson': 'The bridge was always there. You just had to stand right.',
      'perspective.raised': raisedLine('stack').en,
      'perspective.fig1': 'fig. 01: size is only distance',
      'perspective.fig2': 'fig. 02: from here',
      'perspective.fig3': 'fig. 03: small enough',
      'perspective.stack0': stackEn[0],
      'perspective.stack1': stackEn[1],
      'perspective.stack2': stackEn[2],
      'perspective.h1': 'Hold the cube, look down the hall, and put it down far away.',
      'perspective.h2':
        'What you hold keeps its look; set down far away it grows, close by it shrinks. The ledge wants something in between.',
      'perspective.h3': 'Stand on the red square at the chasm and look down the gap.',
    },
    cs: {
      'perspective.lesson': 'Most tu byl celou dobu. Stačilo stát na správném místě.',
      'perspective.raised': raisedLine('stack').cs,
      'perspective.fig1': 'obr. 01: velikost je jen vzdálenost',
      'perspective.fig2': 'obr. 02: odsud',
      'perspective.fig3': 'obr. 03: dost malé',
      'perspective.stack0': stackCs[0],
      'perspective.stack1': stackCs[1],
      'perspective.stack2': stackCs[2],
      'perspective.h1': 'Vezmi kostku, podívej se dlouhou halou a polož ji daleko.',
      'perspective.h2':
        'Co držíš, si drží vzhled: položené daleko naroste, položené blízko se zmenší. Římsa chce něco mezi tím.',
      'perspective.h3': 'Postav se na červený čtverec u propasti a podívej se podél mezery.',
    },
  },
}
