import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { Game } from '../../src/gameplay/game'
import { createObserved, stepObserved } from '../../src/gameplay/observation'
import { transformPoint, transformYaw } from '../../src/gameplay/portals'
import { evalCond } from '../../src/gameplay/progression'
import { box, room, run, tap } from './helpers'

const walk = (x: number, y: number) => ({ x, y, jump: false, interact: false })

describe('observation', () => {
  it('flips only after the hold time and never while blocked', () => {
    const o = createObserved(true)
    expect(stepObserved(o, false, 0.1, false)).toBe(false)
    expect(stepObserved(o, false, 0.1, false)).toBe(true)
    expect(o.seen).toBe(false)
    expect(stepObserved(o, true, 0.5, true)).toBe(false)
    expect(o.seen).toBe(false)
  })

  it('ghost wall exists while seen and opens when the player looks away', () => {
    const g = new Game([
      room('a', {
        entities: [
          { type: 'ghost', id: 'w', box: box([-1, 0, -6], [1, 3, -5.5]), present: 'seen' },
        ],
      }),
    ])
    run(g, 0.5)
    expect(g.ghosts[0].present).toBe(true)
    g.player.yaw = Math.PI
    run(g, 0.5)
    expect(g.ghosts[0].present).toBe(false)
  })

  it('unseen ghost does not appear inside the player', () => {
    const g = new Game([
      room('a', {
        entities: [{ type: 'ghost', id: 'w', box: box([-1, 0, -1], [1, 2, 1]), present: 'unseen' }],
      }),
    ])
    g.player.pitch = 1.4
    run(g, 0.5)
    expect(g.ghosts[0].present).toBe(false)
  })
})

describe('portals', () => {
  it('round-trips a rigid transform', () => {
    const p = new Vector3(3, 1, -2)
    transformPoint(p, [0, 0, 0], [10, 0, 0], 90)
    transformPoint(p, [10, 0, 0], [0, 0, 0], 270)
    expect(p.x).toBeCloseTo(3)
    expect(p.z).toBeCloseTo(-2)
    expect(transformYaw(0, 180)).toBeCloseTo(Math.PI)
  })

  it('direction-gated trigger teleports only when entered moving that way', () => {
    const area = room('a', {
      triggers: [
        {
          id: 't',
          box: box([-10, 0, -4], [10, 3, -3]),
          dir: [0, 0, -1],
          actions: [{ type: 'teleport', from: [0, 0, 0], to: [0, 0, 6] }],
        },
      ],
    })
    const g = new Game([area])
    run(g, 0.3)
    run(g, 1.2, walk(0, 1))
    expect(g.player.pos.z).toBeGreaterThan(0)
  })
})

describe('cubes, plates, doors', () => {
  const area = () =>
    room('a', {
      entities: [
        { type: 'cube', id: 'c', pos: [0, 0.3, -1.5], size: 0.6 },
        {
          type: 'plate',
          id: 'p',
          box: box([2, 0, -2], [3, 0.04, -1]),
          flag: 'open',
          latch: 'done',
        },
        { type: 'door', id: 'd', box: box([-1, 0, -8], [1, 3, -7.5]), openWhen: 'open' },
      ],
    })

  it('grabs the cube in the aim cone and drops it onto a plate, opening the door', () => {
    const g = new Game([area()])
    run(g, 0.3)
    g.player.pitch = -0.4
    run(g, 0.1)
    expect(g.prompt).toBe('grab')
    tap(g)
    expect(g.held).not.toBeNull()
    g.warp([2.5, 0.85, 0.2], 0)
    g.player.pitch = -0.6
    run(g, 0.1)
    tap(g)
    expect(g.held).toBeNull()
    run(g, 1.5)
    expect(g.flags.all.has('open')).toBe(true)
    expect(g.flags.persistent.has('done')).toBe(true)
    expect(g.doors[0].solid).toBe(false)
    expect(g.solidAt([0, 1, -7.7])).toBe(false)
  })

  it('reset restores cube and transient flags but keeps latched ones', () => {
    const g = new Game([area()])
    g.setFlag('open')
    g.setFlag('done', true, true)
    g.cubes[0].pos.set(5, 5, 5)
    g.resetArea('a')
    expect(g.flags.all.has('open')).toBe(false)
    expect(g.flags.all.has('done')).toBe(true)
    expect(g.cubes[0].pos.z).toBeCloseTo(-1.5)
  })
})

describe('perspective', () => {
  it('scalable cube grows when placed further away', () => {
    const g = new Game([
      room('a', {
        entities: [{ type: 'cube', id: 'c', pos: [0, 0.25, -1.5], size: 0.5, scalable: true }],
      }),
    ])
    run(g, 0.3)
    g.player.pitch = -0.45
    run(g, 0.05)
    tap(g)
    expect(g.held).not.toBeNull()
    g.player.pitch = 0
    run(g, 0.05)
    expect(g.heldPlacement.size).toBeGreaterThan(1.5)
    tap(g)
    run(g, 2)
    expect(g.cubes[0].size).toBeGreaterThan(1.5)
    expect(g.cubes[0].pos.y).toBeCloseTo(g.cubes[0].size / 2, 1)
  })
})

describe('gravity', () => {
  it('gravity strip turns a wall into the floor and cubes follow', () => {
    const g = new Game([
      room('a', {
        entities: [{ type: 'cube', id: 'c', pos: [0, 3, 5], size: 0.6 }],
        triggers: [
          {
            id: 'g',
            box: box([-10, 0, -10], [10, 6, -9]),
            actions: [{ type: 'gravity', dir: '-z' }],
          },
        ],
      }),
    ])
    run(g, 0.3)
    run(g, 2.5, walk(0, 1))
    expect(g.player.gravity).toBe('-z')
    run(g, 1.5)
    expect(g.player.pos.z).toBeCloseTo(-10 + 0.85, 1)
    expect(g.cubes[0].pos.z).toBeCloseTo(-10 + 0.3, 1)
  })

  it('reduced motion switches the camera instantly', () => {
    const g = new Game(
      [
        room('a', {
          triggers: [
            {
              id: 'g',
              box: box([-10, 0, -10], [10, 6, 10]),
              actions: [{ type: 'gravity', dir: '+y' }],
            },
          ],
        }),
      ],
      undefined,
      { reducedMotion: true },
    )
    run(g, 0.05)
    expect(g.player.turnT).toBe(1)
    expect(g.player.view.equals(g.player.frame)).toBe(true)
  })
})

describe('conditions', () => {
  it('evaluates nested expressions', () => {
    const f = new Set(['a', 'b'])
    expect(evalCond({ all: ['a', { not: 'c' }] }, f)).toBe(true)
    expect(evalCond({ any: ['c', { all: ['a', 'x'] }] }, f)).toBe(false)
  })
})

describe('integration fixes', () => {
  it('a 180° teleport turns the view around exactly once', () => {
    const g = new Game([
      room('a', {
        triggers: [
          {
            id: 't',
            box: box([-10, 0, -4], [10, 3, -3]),
            actions: [{ type: 'teleport', from: [0, 0, -3.5], to: [0, 0, 3.5], rotY: 180 }],
          },
        ],
      }),
    ])
    run(g, 0.3)
    run(g, 1.2, walk(0, 1))
    // Walked toward -z into the trigger, arrived at +z rotated 180°: now heading +z.
    const z0 = g.player.pos.z
    run(g, 0.5, walk(0, 1))
    expect(g.player.pos.z).toBeGreaterThan(z0)
  })

  it('a cube carried out of its area is recalled when the player returns', () => {
    const a = room('a', { entities: [{ type: 'cube', id: 'c', pos: [0, 0.3, -2], size: 0.6 }] })
    const b2 = room('b', { bounds: { min: [20, -5, -12], max: [44, 10, 12] }, boxes: [] })
    const g = new Game([a, b2])
    g.cubes[0].pos.set(30, 0.3, 0)
    g.cubes[0].box.setFromCenterAndSize(g.cubes[0].pos, new Vector3(0.6, 0.6, 0.6))
    g.warp([30, 0.85, 3])
    run(g, 0.1)
    g.warp([0, 0.85, 3])
    run(g, 0.1)
    expect(g.cubes[0].pos.x).toBeCloseTo(0)
  })

  it('looking straight down still lets a held cube be placed', () => {
    const g = new Game([
      room('a', { entities: [{ type: 'cube', id: 'c', pos: [0, 0.3, -1.4], size: 0.6 }] }),
    ])
    run(g, 0.3)
    g.player.pitch = -0.6
    run(g, 0.05)
    tap(g)
    expect(g.held).not.toBeNull()
    g.player.pitch = -1.5
    run(g, 0.05)
    expect(g.prompt).toBe('drop')
  })
})
