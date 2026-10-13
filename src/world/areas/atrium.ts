import { SIGILS } from '../../gameplay/progression'
import { b, box, frame, hollow } from '../build'
import type { AreaDef, BoxDef } from '../types'
import { monument, monumentStrings } from './monuments'

const MON = monumentStrings(['about', 'capabilities', 'stack', 'experience'])

// The Atrium — hub. Open to the sky, colonnaded, with a sealed ink core in the middle.
// Doorways: west → Loop, east → Perspective, north → Inversion. The core opens when all
// three sigils are held and leads to the Convergence.
//
// Doorway contract for area authors (world coordinates, gap height 3 m):
//   west  : x = -16.4..-16, z = -33.2..-30.8   → Loop region        x < -16.4
//   east  : x = 16..16.4,   z = -33.2..-30.8   → Perspective region x > 16.4
//   north : z = -52.4..-52, x = -1.2..1.2      → Inversion region   z < -52.4

const MIN = [-16, 0, -52] as const
const MAX = [16, 14, -12] as const

const columns: BoxDef[] = []
for (let z = -46; z <= -18; z += 7) {
  columns.push(b([-12.6, 0, z - 0.5], [-11.6, 14, z + 0.5]))
  columns.push(b([11.6, 0, z - 0.5], [12.6, 14, z + 0.5]))
}

// Core: an ink monolith with a door on its south face.
const core: BoxDef[] = [
  b([-3, 0, -35], [3, 11, -34.6], 'ink'),
  b([-3, 0, -34.6], [-2.6, 11, -29.4], 'ink'),
  b([2.6, 0, -34.6], [3, 11, -29.4], 'ink'),
  b([-3, 0, -29.4], [-1, 11, -29], 'ink'),
  b([1, 0, -29.4], [3, 11, -29], 'ink'),
  b([-1, 3, -29.4], [1, 11, -29], 'ink'),
  b([-3, 11, -35], [3, 11.4, -29], 'ink'),
]

const sigilMarks: BoxDef[] = SIGILS.map((s, i) =>
  b([-1.5 + i * 1.1, 4, -28.98], [-0.7 + i * 1.1, 4.8, -28.94], 'accent', s),
)

export const atrium: AreaDef = {
  id: 'atrium',
  bounds: box([-16.4, -5, -52.4], [16.4, 30, -11.6]),
  spawn: { pos: [0, 0.85, -15], yaw: 0 },
  boxes: [
    ...hollow(MIN, MAX, {
      ceiling: false,
      gaps: [
        { side: 's', at: 0, width: 2.4, height: 3 },
        { side: 'w', at: -32, width: 2.4, height: 3 },
        { side: 'e', at: -32, width: 2.4, height: 3 },
        { side: 'n', at: 0, width: 2.4, height: 3 },
      ],
    }),
    ...columns,
    ...core,
    ...sigilMarks,
    ...frame('w', -16, -32, 2.4, 3, 0, 'ink'),
    ...frame('e', 16, -32, 2.4, 3, 0, 'ink'),
    ...frame('n', -52, 0, 2.4, 3, 0, 'ink'),
    // A stair that climbs into the fog and stops. Decoration, and a promise.
    ...Array.from({ length: 10 }, (_, i) =>
      b([6, 0, -47 + i * 0.6], [9, 0.3 * (i + 1), -46.4 + i * 0.6], 'surface'),
    ),
  ],
  entities: [
    // Portfolio monuments: shards that read only from the red square on the floor.
    monument('about', { vantage: [0, 1.47, -14.6], center: [0, 15.5, -31], height: 8 }),
    monument('capabilities', {
      vantage: [-8, 1.47, -21],
      center: [-8.5, 15, -48],
      height: 5.5,
      when: 'sigil:loop',
    }),
    monument('stack', {
      vantage: [8, 1.47, -21],
      center: [8.5, 15, -48],
      height: 5.5,
      when: 'sigil:perspective',
    }),
    monument('experience', {
      vantage: [0, 1.47, -46],
      center: [0, 15.5, -14],
      height: 6,
      when: 'sigil:inversion',
    }),
    {
      type: 'door',
      id: 'core',
      box: box([-1, 0, -29.4], [1, 3, -29]),
      openWhen: { all: [...SIGILS] },
    },
    { type: 'caption', id: 'c-core', text: 'atrium.core', pos: [0, 5.4, -28.9], size: 0.14 },
    { type: 'caption', id: 'c-w', text: 'atrium.west', pos: [-15.97, 3.6, -32], rotY: Math.PI / 2 },
    { type: 'caption', id: 'c-e', text: 'atrium.east', pos: [15.97, 3.6, -32], rotY: -Math.PI / 2 },
    { type: 'caption', id: 'c-n', text: 'atrium.north', pos: [0, 3.6, -51.97] },
    { type: 'caption', id: 'c-stair', text: 'atrium.stair', pos: [7.5, 3.4, -41.2], size: 0.12 },
  ],
  triggers: [
    {
      id: 'enter',
      box: box([-1.2, 0, -13.5], [1.2, 3, -12]),
      once: true,
      actions: [{ type: 'event', name: 'atrium' }],
    },
  ],
  hints: ['atrium.h1', 'atrium.h2'],
  strings: {
    en: {
      ...MON.en,
      'atrium.core': 'fig. 05: sealed until the three agree',
      'atrium.west': 'fig. 02: loop',
      'atrium.east': 'fig. 03: perspective',
      'atrium.north': 'fig. 04: inversion',
      'atrium.stair': 'fig. unfinished',
      'atrium.h1': 'Three doorways, any order. Each hides one mark for the core.',
      'atrium.h2': 'The marks above the core door show what you already carry.',
    },
    cs: {
      ...MON.cs,
      'atrium.core': 'obr. 05: zapečetěno, dokud se ty tři neshodnou',
      'atrium.west': 'obr. 02: smyčka',
      'atrium.east': 'obr. 03: perspektiva',
      'atrium.north': 'obr. 04: inverze',
      'atrium.stair': 'obr. nedokončeno',
      'atrium.h1': 'Tři průchody, libovolné pořadí. Každý skrývá jednu značku pro jádro.',
      'atrium.h2': 'Značky nad dveřmi jádra ukazují, co už neseš.',
    },
  },
}
