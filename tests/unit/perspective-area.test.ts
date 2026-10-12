import { describe, expect, it } from 'vitest'
import { Game } from '../../src/gameplay/game'
import { perspective } from '../../src/world/areas/perspective'
import { idle, run, tap } from './helpers'

const mk = () => {
  const g = new Game([perspective])
  run(g, 0.3)
  return g
}

/** Looks from the player's eye at a world point. */
function aimAt(g: Game, p: readonly [number, number, number]) {
  const e = g.player.pos
  const dx = p[0] - e.x
  const dz = p[2] - e.z
  g.player.yaw = Math.atan2(-dx, -dz)
  g.player.pitch = Math.atan2(p[1] - (e.y + 0.62), Math.hypot(dx, dz))
}

const grabCube = (g: Game) => {
  const c = g.cubes[0]
  aimAt(g, [c.pos.x, c.pos.y, c.pos.z])
  run(g, 0.05)
  tap(g)
  expect(g.held).not.toBeNull()
}

/** Plays the hall-1 lesson: grow the cube far away onto the strip, opening the door. */
function demo(g: Game) {
  g.warp([18, 0.85, -32], -Math.PI / 2)
  run(g, 0.2)
  grabCube(g)
  g.player.pitch = 0
  run(g, 0.05)
  tap(g)
  run(g, 2)
  expect(g.cubes[0].size).toBeGreaterThan(1.2)
  expect(g.flags.persistent.has('perspective:strip-done')).toBe(true)
}

/** Sets the held cube down as close as the placement allows (steep look at the floor). */
function dropClose(g: Game) {
  for (let pitch = -1.2; pitch < -0.2; pitch += 0.1) {
    g.player.pitch = pitch
    run(g, 0.05)
    if (g.heldPlacement.fits) break
  }
  expect(g.heldPlacement.fits).toBe(true)
  tap(g)
  expect(g.held).toBeNull()
  run(g, 1.5)
}

/** Takes the big cube from the strip and shrinks it by setting it down close and re-grabbing. */
function fetchSmall(g: Game) {
  for (let i = 0; i < 3 && g.cubes[0].size > 0.45; i++) {
    const c = g.cubes[0]
    g.warp([c.pos.x - (i === 0 ? 4 : 1.6), 0.85, c.pos.z], -Math.PI / 2)
    run(g, 0.2)
    grabCube(g)
    dropClose(g)
  }
  expect(g.cubes[0].size).toBeLessThan(0.45)
  const c = g.cubes[0]
  g.warp([c.pos.x - 2.4, 0.85, c.pos.z], -Math.PI / 2)
  run(g, 0.2)
  grabCube(g)
}

/** Walks away from the ledge face until the held cube would be 0.7-1.0 m, then drops it. */
function placeAtLedge(g: Game) {
  for (let z = -43; z < -36.5; z += 0.25) {
    g.warp([23, 0.85, z], 0)
    g.player.pitch = 0
    run(g, 0.05)
    if (g.heldPlacement.size >= 0.7 && g.heldPlacement.size <= 1.0 && g.heldPlacement.fits) {
      tap(g)
      run(g, 1.5)
      return
    }
  }
  throw new Error('no placement found')
}

function climb(g: Game) {
  g.player.pitch = 0
  g.player.yaw = 0
  run(g, 2, { x: 0, y: 1, jump: true, interact: false })
}

describe('perspective area', () => {
  it('full solve: grow, climb, align, cross', () => {
    const g = mk()
    demo(g)
    fetchSmall(g)
    placeAtLedge(g)
    expect(g.cubes[0].size).toBeGreaterThan(0.6)
    expect(g.cubes[0].size).toBeLessThan(1.1)
    // Too high without the cube.
    const cz = g.cubes[0].pos.z
    expect(cz).toBeGreaterThan(-44)
    g.warp([23, 0.85, -40], 0)
    run(g, 0.3)
    climb(g)
    expect(g.player.pos.y).toBeGreaterThan(1.6 + 0.8)
    expect(g.player.pos.z).toBeLessThan(-44.3)

    // Marker: eye at the vantage, looking down the gap.
    g.warp([23, 1.6 + 0.85, -49], 0)
    g.player.pitch = -0.24
    run(g, 0.1)
    expect(g.flags.all.has('perspective:bridge')).toBe(true)
    run(g, 3, { x: 0, y: 1, jump: false, interact: false })
    expect(g.player.pos.z).toBeLessThan(-61)
    expect(g.flags.persistent.has('sigil:perspective')).toBe(true)
    expect(g.player.pos.y).toBeGreaterThan(2.3)
  })

  it('the ledge cannot be reached without the cube', () => {
    const g = mk()
    g.warp([23, 0.85, -40], 0)
    run(g, 0.3)
    climb(g)
    expect(g.player.pos.y).toBeLessThan(1.6)
  })

  it('bridge is not solid from elsewhere, only from the vantage', () => {
    const g = mk()
    g.warp([19, 1.6 + 0.85, -47], 0)
    g.player.pitch = -0.24
    run(g, 0.2)
    expect(g.flags.all.has('perspective:bridge')).toBe(false)
    expect(g.solidAt([23, 1.5, -55])).toBe(false)
    // Right spot but looking away.
    g.warp([23, 1.6 + 0.85, -49], Math.PI)
    run(g, 0.2)
    expect(g.solidAt([23, 1.5, -55])).toBe(false)
    g.warp([23, 1.6 + 0.85, -49], 0)
    g.player.pitch = -0.24
    run(g, 0.2)
    expect(g.solidAt([23, 1.5, -55])).toBe(true)
    // Fragments themselves never block.
    expect(g.solidAt([23, 2.2, -50.6])).toBe(false)
  })

  it('secret: a shrunk cube through the window opens the hidden room', () => {
    const g = mk()
    demo(g)
    fetchSmall(g)
    g.warp([25.6, 0.85, -41], -Math.PI / 2)
    g.player.pitch = -0.12
    run(g, 0.1)
    expect(g.heldPlacement.size).toBeLessThan(0.95)
    tap(g)
    run(g, 1.5)
    expect(g.cubes[0].pos.x).toBeGreaterThan(29.4)
    expect(g.flags.persistent.has('perspective:niche-done')).toBe(true)
    // The cube can be taken back out through the window.
    g.held = null
    g.warp([27.4, 0.85, -41], -Math.PI / 2)
    aimAt(g, [g.cubes[0].pos.x, g.cubes[0].pos.y, g.cubes[0].pos.z])
    run(g, 0.05)
    expect(g.target()).not.toBeNull()
    // The door sits on the ledge (reached by climbing, as in the full solve).
    g.warp([23, 1.6 + 0.85, -47.4], -Math.PI / 2)
    run(g, 2, { x: 0, y: 1, jump: false, interact: false })
    expect(g.player.pos.x).toBeGreaterThan(31)
    expect(g.flags.persistent.has('secret:perspective')).toBe(true)
  })

  it('a big cube cannot go through the window', () => {
    const g = mk()
    demo(g)
    const c = g.cubes[0]
    g.warp([c.pos.x - 4, 0.85, c.pos.z], -Math.PI / 2)
    run(g, 0.2)
    grabCube(g)
    g.warp([25.6, 0.85, -41], -Math.PI / 2)
    g.player.pitch = 0
    run(g, 0.1)
    tap(g)
    run(g, 1.5)
    expect(g.cubes[0].pos.x).toBeLessThan(29)
    expect(g.flags.persistent.has('perspective:niche-done')).toBe(false)
  })

  it('resetArea restores the cube', () => {
    const g = mk()
    demo(g)
    expect(g.cubes[0].size).toBeGreaterThan(1.2)
    g.resetArea('perspective')
    expect(g.cubes[0].size).toBeCloseTo(0.5)
    expect(g.cubes[0].pos.x).toBeCloseTo(19)
    expect(idle.jump).toBe(false)
  })
})
