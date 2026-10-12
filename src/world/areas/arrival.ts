import { b, box, frame, hollow } from '../build'
import type { AreaDef } from '../types'

// Area 1 — The Arrival. Teaches observation without words.
// Room A: a door is drawn on the north wall. Watched, it is wall; unwatched, it is open.
//   Solution: walk through it backwards (or sideways with the frame off-screen).
// Vestibule: a cube travels to a plate only while nobody looks. The plate opens the way.

const ROOM_A = { min: [-4, 0, -1] as const, max: [4, 4.5, 6] as const }
const VEST = { min: [-4, 0, -9] as const, max: [4, 4.5, -1.4] as const }

export const arrival: AreaDef = {
  id: 'arrival',
  bounds: box([-6, -5, -11.6], [6, 8, 8]),
  spawn: { pos: [0, 0.85, 4], yaw: 0 },
  boxes: [
    // Room A: floor, ceiling, three walls. Its north wall is the vestibule's south wall.
    ...hollow(ROOM_A.min, ROOM_A.max, { floor: false }).filter(
      (w) => !(w.min[2] === -1.4 && w.max[2] === -1),
    ),
    b([-4.4, -0.4, -1], [4.4, 0, 6.4]),
    ...frame('n', -1, 0, 1.6, 2.4),
    // Vestibule shares the drawn-door wall; its own north wall has the real door.
    ...hollow(VEST.min, VEST.max, {
      gaps: [
        { side: 's', at: 0, width: 1.6, height: 2.4 },
        { side: 'n', at: 0, width: 2, height: 3 },
      ],
    }),
    // Corridor to the Atrium.
    b([-1.6, -0.4, -11.6], [1.6, 0, -9.4]),
    b([-1.6, 3, -11.6], [1.6, 3.4, -9.4]),
    b([-1.6, 0, -11.6], [-1, 3, -9.4]),
    b([1, 0, -11.6], [1.6, 3, -9.4]),
    // A low ink plinth under the spawn: something solid to stand on, to look from.
    b([-0.9, 0, 3.1], [0.9, 0.02, 4.9], 'surface'),
  ],
  entities: [
    { type: 'ghost', id: 'drawn-door', box: box([-0.8, 0, -1.4], [0.8, 2.4, -1]), present: 'seen' },
    {
      type: 'cube',
      id: 'wanderer',
      pos: [-3, 0.35, -2.6],
      size: 0.7,
      creep: {
        path: [
          [-3, 0.35, -7.4],
          [2.5, 0.35, -7.4],
        ],
        speed: 1.3,
      },
    },
    {
      type: 'plate',
      id: 'plate',
      box: box([1.9, 0, -8], [3.1, 0.04, -6.8]),
      flag: 'arrival:plate',
      latch: 'arrival:done',
    },
    {
      type: 'door',
      id: 'exit',
      box: box([-1, 0, -9.4], [1, 3, -9]),
      openWhen: { any: ['arrival:plate', 'arrival:done'] },
    },
    { type: 'caption', id: 'c1', text: 'arrival.fig1', pos: [1.9, 1.6, -0.98], size: 0.12 },
    {
      type: 'caption',
      id: 'c2',
      text: 'arrival.fig2',
      pos: [3.97, 1.6, -5],
      rotY: -Math.PI / 2,
      size: 0.12,
    },
    {
      type: 'caption',
      id: 'c3',
      text: 'arrival.title',
      pos: [0, 3.4, 5.97],
      rotY: Math.PI,
      size: 0.5,
      style: 'display',
    },
  ],
  triggers: [
    {
      id: 'vestibule',
      box: box([-4, 0, -3.4], [4, 3, -1.6]),
      actions: [
        { type: 'checkpoint', pos: [0, 0.85, -3], yaw: 0 },
        { type: 'flag', flag: 'arrival:door', persist: true },
      ],
    },
    {
      id: 'leave',
      box: box([-1, 0, -11.5], [1, 3, -10.4]),
      actions: [
        { type: 'checkpoint', pos: [0, 0.85, -15], yaw: 0 },
        { type: 'flag', flag: 'arrival:left', persist: true },
      ],
    },
  ],
  hints: ['arrival.h1', 'arrival.h2', 'arrival.h3'],
  strings: {
    en: {
      'arrival.fig1': 'fig. 01 — a door, drawn',
      'arrival.fig2': 'fig. 02 — nobody is watching',
      'arrival.title': 'The Unbuilt',
      'arrival.h1':
        'Something on the north wall changes. Watch the frame from the corner of your eye.',
      'arrival.h2': 'The doorway is only a wall while you are looking at it.',
      'arrival.h3': 'Walk through it backwards. In the next room, look away and let things move.',
    },
    cs: {
      'arrival.fig1': 'obr. 01 — dveře, nakreslené',
      'arrival.fig2': 'obr. 02 — nikdo se nedívá',
      'arrival.title': 'The Unbuilt',
      'arrival.h1': 'Na severní stěně se něco mění. Sleduj rám koutkem oka.',
      'arrival.h2': 'Ze dveří je zeď, jen dokud se na ně díváš.',
      'arrival.h3': 'Projdi jimi pozpátku. V další místnosti se odvrať a nech věci pohnout.',
    },
  },
}
