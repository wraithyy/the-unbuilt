import { Box3, Vector3 } from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { createPlayer, setGravity } from '../../src/engine/player'
import { Game } from '../../src/gameplay/game'
import { areas } from '../../src/world/areas'
import { room, run } from './helpers'

describe('world data', () => {
  it('area bounds never overlap', () => {
    const boxes = areas.map((a) => ({
      id: a.id,
      b: new Box3(new Vector3(...a.bounds.min), new Vector3(...a.bounds.max)),
    }))
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b
        const c = boxes[j].b
        const overlap =
          a.min.x < c.max.x &&
          a.max.x > c.min.x &&
          a.min.y < c.max.y &&
          a.max.y > c.min.y &&
          a.min.z < c.max.z &&
          a.max.z > c.min.z
        expect(overlap, `${boxes[i].id} vs ${boxes[j].id}`).toBe(false)
      }
  })

  it('every spawn lies inside its own area', () => {
    const g = new Game(areas)
    for (const a of areas) expect(g.areaAt(new Vector3(...a.spawn.pos))).toBe(a.id)
  })
})

describe('robustness', () => {
  it('a checkpoint outside every area falls back to the first spawn', () => {
    const g = new Game([room('a')], {
      flags: [],
      checkpoint: { pos: [500, 0, 500], yaw: 0, gravity: '-y' },
    })
    expect(g.player.pos.x).toBeCloseTo(0)
  })

  it('a cube that falls out of the world comes back', () => {
    const g = new Game([
      room('a', { entities: [{ type: 'cube', id: 'c', pos: [0, 0.3, -2], size: 0.6 }] }),
    ])
    g.cubes[0].pos.set(0, -40, 0)
    run(g, 2.5)
    expect(g.cubes[0].pos.z).toBeCloseTo(-2)
  })

  it('gravity change is refused when the re-oriented player cannot fit', () => {
    // A 0.8 m tall crawlway: standing up along x is impossible.
    const solids = [
      new Box3(new Vector3(-5, -5, -5), new Vector3(-0.31, 5, 5)),
      new Box3(new Vector3(0.31, -5, -5), new Vector3(5, 5, 5)),
    ]
    const p = createPlayer([0, 0.85, 0], 0)
    expect(setGravity(p, '-x', solids)).toBe(false)
    expect(p.gravity).toBe('-y')
  })
})

describe('settings', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('rejects out-of-range and unknown stored values', async () => {
    const stored = JSON.stringify({
      quality: 'x',
      lang: 'de',
      joystickSize: 0,
      volume: 9,
      theme: 'dark',
    })
    Object.assign(globalThis, {
      localStorage: {
        getItem: () => stored,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    })
    const { loadSettings } = await import('../../src/app/store')
    const s = loadSettings()
    expect(['low', 'medium']).toContain(s.quality)
    expect(['en', 'cs']).toContain(s.lang)
    expect(s.joystickSize).toBe(0.7)
    expect(s.volume).toBe(1)
    expect(s.theme).toBe('dark')
  })
})
