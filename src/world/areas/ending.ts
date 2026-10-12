import { portfolio } from '../../portfolio/data'
import { b, box, hollow } from '../build'
import type { AreaDef, EntityDef } from '../types'

// The Unbuilt — the room behind the oculus. Its colonnade is only built while nobody is
// looking (wireframe when watched, filled when you turn away: the site's "fig. 01 —
// wireframe, no fill"). The author's name is the far wall. Reaching the plinth ends the game.

const columns: EntityDef[] = []
for (let i = 0; i < 4; i++) {
  const z = -272 - i * 5
  for (const x of [-8, 7]) {
    columns.push({
      type: 'ghost',
      id: `col-${x}-${i}`,
      box: box([x, 0, z - 0.5], [x + 1, 9, z + 0.5]),
      present: 'unseen',
    })
  }
}

export const ending: AreaDef = {
  id: 'ending',
  bounds: box([-15, -10, -298], [15, 20, -262]),
  spawn: { pos: [0, 0.85, -268], yaw: 0 },
  boxes: [
    ...hollow([-12, 0, -294], [12, 10, -264]),
    b([-1.2, 0, -287], [1.2, 0.3, -284.6], 'surface'),
    b([-0.6, 0.3, -286.4], [0.6, 1.1, -285.2], 'ink'),
  ],
  entities: [
    ...columns,
    {
      type: 'caption',
      id: 'name',
      text: 'end.name',
      pos: [0, 5.2, -293.97],
      size: 1.5,
      style: 'display',
    },
    { type: 'caption', id: 'role', text: 'end.role', pos: [0, 3.4, -293.97], size: 0.3 },
    { type: 'caption', id: 'fig', text: 'end.fig', pos: [0, 1.6, -285.18], size: 0.1 },
    { type: 'caption', id: 'cols', text: 'end.cols', pos: [-11.97, 2, -278], rotY: Math.PI / 2 },
  ],
  triggers: [
    {
      id: 'plinth',
      box: box([-1.6, 0, -287.4], [1.6, 3, -284.2]),
      actions: [{ type: 'flag', flag: 'ending:seen', persist: true }, { type: 'ending' }],
    },
  ],
  strings: {
    en: {
      'end.name': portfolio.en.name,
      'end.role': portfolio.en.role,
      'end.fig': 'fig. ∞ — unbuilt',
      'end.cols': 'fig. 08 — built while nobody was looking',
    },
    cs: {
      'end.name': portfolio.cs.name,
      'end.role': portfolio.cs.role,
      'end.fig': 'obr. ∞ — nepostaveno',
      'end.cols': 'obr. 08 — postaveno, když se nikdo nedíval',
    },
  },
}
