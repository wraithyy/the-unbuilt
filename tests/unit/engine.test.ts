import { Box3, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { moveBox, rayBox } from '../../src/engine/collision'
import { Game } from '../../src/gameplay/game'
import { box, camera, room, run } from './helpers'

describe('collision', () => {
  it('stops at a wall and slides along it', () => {
    const wall = new Box3(new Vector3(1, -5, -5), new Vector3(2, 5, 5))
    const c = new Vector3(0, 0, 0)
    const half = new Vector3(0.3, 0.3, 0.3)
    moveBox(c, half, new Vector3(2, 0, 1), [wall])
    expect(c.x).toBeCloseTo(0.7, 3)
    expect(c.z).toBeCloseTo(1, 3)
  })

  it('does not tunnel through thin floors at high speed', () => {
    const floor = new Box3(new Vector3(-5, -0.1, -5), new Vector3(5, 0, 5))
    const c = new Vector3(0, 2, 0)
    moveBox(c, new Vector3(0.3, 0.85, 0.3), new Vector3(0, -6, 0), [floor])
    expect(c.y).toBeGreaterThan(0.84)
  })

  it('ray hits box at entry distance', () => {
    const b = new Box3(new Vector3(-1, -1, 4), new Vector3(1, 1, 6))
    expect(rayBox(new Vector3(), new Vector3(0, 0, 1), b, 100)).toBeCloseTo(4)
  })
})

describe('player', () => {
  it('lands on the floor and walks forward (-z at yaw 0)', () => {
    const g = new Game([room()])
    run(g, 0.5)
    expect(g.player.grounded).toBe(true)
    expect(g.player.pos.y).toBeCloseTo(0.85, 2)
    run(g, 1, { x: 0, y: 1, jump: false, interact: false })
    expect(g.player.pos.z).toBeLessThan(-3)
  })

  it('steps up small ledges but not tall ones', () => {
    const low = room('a', { boxes: [...room().boxes, box([-10, 0, -3], [10, 0.35, -2.5])] })
    const g = new Game([low])
    run(g, 0.3)
    run(g, 1.5, { x: 0, y: 1, jump: false, interact: false })
    expect(g.player.pos.z).toBeLessThan(-3)

    const high = room('b', { boxes: [...room().boxes, box([-10, 0, -3], [10, 1, -2.5])] })
    const h = new Game([high])
    run(h, 0.3)
    run(h, 1.5, { x: 0, y: 1, jump: false, interact: false })
    expect(h.player.pos.z).toBeGreaterThan(-2.5)
  })

  it('jumps about 1.1 m', () => {
    const g = new Game([room()])
    run(g, 0.3)
    let top = 0
    g.step(1 / 60, { x: 0, y: 0, jump: true, interact: false }, camera())
    for (let i = 0; i < 60; i++) {
      run(g, 1 / 60)
      top = Math.max(top, g.player.pos.y)
    }
    expect(top - 0.85).toBeGreaterThan(1.05)
    expect(top - 0.85).toBeLessThan(1.4)
  })

  it('respawns at checkpoint when falling out of the world', () => {
    const pit = room('pit', { boxes: room().boxes.slice(1) })
    const g = new Game([pit])
    let respawned = 0
    g.on((e) => {
      if (e.name === 'respawn') respawned++
    })
    run(g, 3)
    expect(respawned).toBeGreaterThan(0)
  })
})
