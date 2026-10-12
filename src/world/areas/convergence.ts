import { b, box, frame, hollow } from '../build'
import type { AreaDef, BoxDef, EntityDef } from '../types'

// Area 5 — The Convergence. Reached through the Atrium core once all three sigils are held.
//
// 0. Larger inside (L): the core is 5 m deep from outside; stepping in teleports to an
//    identical doorway at the head of a 20 m corridor.
// 1. Stair of the unwatched (O): the only way to the balcony is a stair that exists only
//    while you are not looking at it — climb it backwards.
// 2. Grown from afar (P): a tiny cube on the balcony; the plate in front of the black tower
//    needs a cube of at least 2 m. Hold it close, look down at the plate far away, let go.
// 3. Falling up (G): inside the tower an accent floor turns gravity over; you fall onto the
//    ceiling. The ceiling oculus is sealed while watched (O again) — back onto it and fall
//    "down" through it into what was never built.
// Safety: an accent strip on the ceiling restores normal gravity (you drop to the floor).

const OFFSET = -150

const hall = { min: [-20, 0, -240] as const, max: [20, 24, -200] as const }
const OCULUS = { x0: -2, x1: 2, z0: -232, z1: -228 }

const unwatchedStair: EntityDef[] = Array.from({ length: 10 }, (_, i) => ({
  type: 'ghost',
  id: `stair-${i}`,
  box: box([-20, 0, -203.6 - 0.6 * (i + 1)], [-17, 0.42 * (i + 1), -203.6 - 0.6 * i]),
  present: 'unseen',
}))

// Ceiling with a square hole (the oculus).
const ceiling: BoxDef[] = [
  b([-20.4, 24, -240.4], [20.4, 24.4, OCULUS.z0]),
  b([-20.4, 24, OCULUS.z1], [20.4, 24.4, -199.6]),
  b([-20.4, 24, OCULUS.z0], [OCULUS.x0, 24.4, OCULUS.z1]),
  b([OCULUS.x1, 24, OCULUS.z0], [20.4, 24.4, OCULUS.z1]),
  // Accent ring around the oculus, on the underside.
  b([-2.2, 23.97, -232.2], [2.2, 24, -232], 'accent'),
  b([-2.2, 23.97, -228], [2.2, 24, -227.8], 'accent'),
  b([-2.2, 23.97, -232], [-2, 24, -228], 'accent'),
  b([2, 23.97, -232], [2.2, 24, -228], 'accent'),
  // Shaft above the oculus, so the fall "down" reads as a room, not the sky.
  b([-2.4, 24.4, -232.4], [-2, 34, -227.6]),
  b([2, 24.4, -232.4], [2.4, 34, -227.6]),
  b([-2, 24.4, -232.4], [2, 34, -232]),
  b([-2, 24.4, -228], [2, 34, -227.6]),
]

// The black tower: hollow, open at the top, door on its south face.
const tower: BoxDef[] = [
  b([-3, 0, -223], [3, 12, -222.6], 'ink'),
  b([-3, 0, -222.6], [-2.6, 12, -217.4], 'ink'),
  b([2.6, 0, -222.6], [3, 12, -217.4], 'ink'),
  b([-3, 0, -217.4], [-1, 12, -217], 'ink'),
  b([1, 0, -217.4], [3, 12, -217], 'ink'),
  b([-1, 3, -217.4], [1, 12, -217], 'ink'),
  b([-2, 0, -222], [2, 0.03, -218], 'accent'),
]

export const convergence: AreaDef = {
  id: 'convergence',
  bounds: box([-25, -10, -245], [25, 40, -170]),
  spawn: { pos: [0, 0.85, -182], yaw: 0 },
  boxes: [
    // Corridor: a replica of the core's doorway, then 20 m that cannot fit inside it.
    b([-3, -0.4, -200], [3, 0, -176]),
    b([-3, 0, -200], [-2.6, 11, -179.4], 'ink'),
    b([2.6, 0, -200], [3, 11, -179.4], 'ink'),
    b([-3, 11, -200], [3, 11.4, -179], 'ink'),
    b([-3, 0, -179.4], [-1, 11, -179], 'ink'),
    b([1, 0, -179.4], [3, 11, -179], 'ink'),
    b([-1, 3, -179.4], [1, 11, -179], 'ink'),
    ...hollow(hall.min, hall.max, {
      ceiling: false,
      gaps: [{ side: 's', at: 0, width: 5.2, height: 11 }],
    }),
    ...ceiling,
    ...tower,
    // Balcony on the west wall, reached by the unwatched stair.
    b([-20, 0, -217], [-15, 4.2, -209.6]),
    // Ceiling strip that returns gravity to normal.
    b([8, 23.97, -216], [12, 24, -212], 'accent'),
    ...frame('s', -217, 0, 2, 3, 0, 'accent'),
  ],
  entities: [
    ...unwatchedStair,
    { type: 'cube', id: 'seed', pos: [-17.5, 4.4, -213], size: 0.4, scalable: true },
    {
      type: 'plate',
      id: 'plate',
      box: box([-6, 0, -215.5], [4, 0.04, -208.5]),
      minSize: 2,
      flag: 'convergence:plate',
      latch: 'convergence:opened',
    },
    {
      type: 'door',
      id: 'tower-door',
      box: box([-1, 0, -217.4], [1, 3, -217]),
      openWhen: { any: ['convergence:plate', 'convergence:opened'] },
    },
    {
      type: 'ghost',
      id: 'oculus',
      box: box([OCULUS.x0, 24, OCULUS.z0], [OCULUS.x1, 24.4, OCULUS.z1]),
      present: 'seen',
    },
    {
      type: 'caption',
      id: 'c1',
      text: 'conv.fig1',
      pos: [0, 4, -200.02],
      rotY: Math.PI,
      size: 0.16,
    },
    { type: 'caption', id: 'c2', text: 'conv.fig2', pos: [-14.6, 5.6, -213], rotY: Math.PI / 2 },
    { type: 'caption', id: 'c3', text: 'conv.fig3', pos: [0, 3.7, -216.98], size: 0.14 },
  ],
  triggers: [
    {
      // Inside the Atrium core: the step that makes the inside bigger than the outside.
      id: 'core-in',
      box: box([-2.6, 0, -31.2], [2.6, 3, -30.4]),
      dir: [0, 0, -1],
      actions: [{ type: 'teleport', from: [0, 0, 0], to: [0, 0, OFFSET] }],
    },
    {
      id: 'core-out',
      box: box([-1, 0, -179.6], [1, 3, -178.8]),
      dir: [0, 0, 1],
      actions: [{ type: 'teleport', from: [0, 0, 0], to: [0, 0, -OFFSET] }],
    },
    {
      id: 'hall',
      box: box([-2.6, 0, -202], [2.6, 3, -200.5]),
      actions: [{ type: 'checkpoint', pos: [0, 0.85, -203], yaw: 0 }],
    },
    {
      id: 'fall-up',
      box: box([-2, 0, -222], [2, 1.2, -218]),
      actions: [{ type: 'gravity', dir: '+y' }],
    },
    {
      id: 'fall-down',
      box: box([8, 22.6, -216], [12, 24, -212]),
      actions: [{ type: 'gravity', dir: '-y' }],
    },
    {
      id: 'oculus',
      box: box([OCULUS.x0, 24.6, OCULUS.z0], [OCULUS.x1, 26, OCULUS.z1]),
      actions: [
        { type: 'gravity', dir: '-y' },
        { type: 'flag', flag: 'convergence:done', persist: true },
        { type: 'event', name: 'solve' },
        { type: 'teleport', from: [0, 25.4, -230], to: [0, 1.6, -268] },
        { type: 'checkpoint', pos: [0, 0.85, -268], yaw: 0 },
      ],
    },
  ],
  hints: ['conv.h1', 'conv.h2', 'conv.h3'],
  strings: {
    en: {
      'conv.fig1': 'fig. 05 — larger on the inside',
      'conv.fig2': 'fig. 06 — small things, far away',
      'conv.fig3': 'fig. 07 — falls the other way',
      'conv.h1': 'The stair is there whenever you are not looking at it.',
      'conv.h2': 'The plate wants something large. Things you hold keep their apparent size.',
      'conv.h3':
        'In the tower, fall up. The opening above is only sealed while someone watches it — close your eyes.',
    },
    cs: {
      'conv.fig1': 'obr. 05 — uvnitř větší',
      'conv.fig2': 'obr. 06 — malé věci, daleko',
      'conv.fig3': 'obr. 07 — padá to jinam',
      'conv.h1': 'Schodiště tam je vždycky, když se na něj nedíváš.',
      'conv.h2': 'Deska chce něco velkého. Co držíš, si drží zdánlivou velikost.',
      'conv.h3':
        'Ve věži padej vzhůru. Otvor nahoře je zavřený, jen když se na něj někdo dívá — zavři oči.',
    },
  },
}
