import { describe, expect, it } from 'vitest'
import { FIXED_DT, Game } from '../../src/gameplay/game'
import { atrium } from '../../src/world/areas/atrium'
import { loop } from '../../src/world/areas/loop'
import { camera, idle, run, tap } from './helpers'

const cam = camera()
const X0 = -16.4
const ux = (u: number) => X0 - u
const uOf = (g: Game) => X0 - g.player.pos.x

function fresh() {
  const g = new Game([loop, atrium])
  g.player.yaw = Math.PI / 2
  run(g, 0.2, idle, cam)
  return g
}

/** Walks to (u, z) holding the current yaw; movement is converted to local input. */
function walkTo(g: Game, u: number, z: number, maxSeconds = 12) {
  for (let i = 0; i < maxSeconds / FIXED_DT; i++) {
    const dx = ux(u) - g.player.pos.x
    const dz = z - g.player.pos.z
    if (Math.hypot(dx, dz) < 0.12) return
    const yaw = g.player.yaw
    const fwd = -Math.sin(yaw) * dx - Math.cos(yaw) * dz
    const right = Math.cos(yaw) * dx - Math.sin(yaw) * dz
    const n = Math.hypot(fwd, right)
    g.step(FIXED_DT, { x: right / n, y: fwd / n, jump: false, interact: false }, cam)
  }
  throw new Error(`stuck going to u=${u} z=${z} at u=${uOf(g)} z=${g.player.pos.z}`)
}

/** Waypoints through one bay heading west (u0 = bay start): S-side past the N baffle, N-side past the S baffle. */
const bayWest = (u0: number): [number, number][] => [
  [u0 - 0.6, -31.5],
  [u0 + 3.8, -31.5],
  [u0 + 4.4, -32.6],
  [u0 + 6.0, -32.6],
  [u0 + 8.8, -31.5],
]
const bayEast = (u0: number): [number, number][] => [...bayWest(u0)].reverse()

function follow(g: Game, pts: [number, number][]) {
  for (const [u, z] of pts) walkTo(g, u, z)
}

/** Walks west from the spawn until the far-end jump has fired (once). */
function firstLap(g: Game) {
  g.player.yaw = Math.PI / 2
  follow(g, [[3, -32], ...bayWest(6), ...bayWest(16).slice(0, 4), [24.7, -32.6]])
  run(g, 0.3, { ...idle, y: 1 }, cam)
}

const home = (u: number) => ux(u)

describe('loop: structure', () => {
  it('the corridor is periodic, so the jump is seamless', () => {
    const g = fresh()
    let compared = 0
    for (let u = 6.5; u < 15.5; u += 0.2)
      for (let z = -33.1; z <= -30.9; z += 0.2)
        for (const y of [0.2, 1, 2.5]) {
          const a = g.solidAt([ux(u), y, z], 0.05)
          const c = g.solidAt([ux(u + 10), y, z], 0.05)
          expect(c, `u=${u} z=${z} y=${y}`).toBe(a)
          compared++
        }
    expect(compared).toBeGreaterThan(500)
  })

  it('the landing spot is not inside any trigger', () => {
    const g = fresh()
    firstLap(g)
    for (const t of g.triggers) expect(t.inside, t.def.id).toBe(false)
  })
})

describe('loop: looping', () => {
  it('walking through the far end returns to the same place, and flips parity each lap', () => {
    const g = fresh()
    const jumps: { before: number[]; after: number[] }[] = []
    let before = [0, 0, 0]
    g.on((e) => {
      if (e.name === 'teleport') jumps.push({ before, after: g.player.pos.toArray() })
    })
    g.player.yaw = Math.PI / 2
    const route: [number, number][] = [
      [3, -32],
      ...bayWest(6),
      ...bayWest(16).slice(0, 4),
      [24.7, -32.6],
    ]
    for (const [u, z] of route) {
      // record position each tick to know where the jump started
      for (let i = 0; i < 2000; i++) {
        before = g.player.pos.toArray()
        const dx = ux(u) - g.player.pos.x
        const dz = z - g.player.pos.z
        if (Math.hypot(dx, dz) < 0.12) break
        const yaw = g.player.yaw
        const fwd = -Math.sin(yaw) * dx - Math.cos(yaw) * dz
        const right = Math.cos(yaw) * dx - Math.sin(yaw) * dz
        const n = Math.hypot(fwd, right)
        g.step(FIXED_DT, { x: right / n, y: fwd / n, jump: false, interact: false }, cam)
      }
    }
    expect(jumps.length).toBe(0)
    run(g, 0.4, { ...idle, y: 1 }, cam)
    expect(jumps.length).toBe(1)
    const j = jumps[0]
    // Shifted exactly one period east, same z, and still facing west.
    expect(j.after[0] - j.before[0]).toBeGreaterThan(9.8)
    expect(j.after[0] - j.before[0]).toBeLessThan(10.1)
    expect(j.after[2]).toBeCloseTo(j.before[2], 1)
    expect(g.player.yaw).toBeCloseTo(Math.PI / 2)
    expect(g.flags.all.has('loop:odd')).toBe(true)
    expect(uOf(g)).toBeLessThan(16)

    // Second lap: parity flips back, and the loop is still a loop.
    follow(g, [...bayWest(16).slice(0, 4), [24.7, -32.6]])
    run(g, 0.4, { ...idle, y: 1 }, cam)
    expect(jumps.length).toBe(2)
    expect(g.flags.all.has('loop:odd')).toBe(false)
    expect(g.flags.persistent.has('sigil:loop')).toBe(false)
  })

  it('the vault door opens only on odd passes', () => {
    const g = fresh()
    run(g, 1, idle, cam)
    const v = g.doors.find((d) => d.def.id === 'vault1')
    expect(v?.solid).toBe(true)
    firstLap(g)
    run(g, 1.2, idle, cam)
    expect(v?.solid).toBe(false)
  })
})

describe('loop: solve', () => {
  it('lap, take the cube, turn away from the hidden niche, anchor, walk on, and return home', () => {
    const g = fresh()
    const events: string[] = []
    g.on((e) => {
      if (e.name === 'custom') events.push(e.id)
    })
    firstLap(g)
    expect(g.flags.all.has('loop:odd')).toBe(true)

    // Bay 1 vault: south wall, u 17.6..19.4. Face it and take the cube.
    follow(g, [
      [15.4, -31.5],
      [18.5, -31.5],
    ])
    g.player.yaw = Math.PI
    g.player.pitch = -0.5
    run(g, 1, idle, cam)
    expect(g.prompt).toBe('grab')
    tap(g, cam)
    expect(g.held).not.toBeNull()

    // Past the south baffle, to the niche in the north wall (u 22.2..24).
    g.player.yaw = Math.PI / 2
    g.player.pitch = 0
    follow(g, [
      [20.4, -31.5],
      [21.2, -32.6],
      [22.2, -32.6],
      [23.1, -31.5],
    ])
    // Watched, the wall is solid; with our back to it, it is not there. Face the far wall and
    // walk backwards into the niche.
    g.player.yaw = Math.PI
    g.player.pitch = 0
    run(g, 0.5, idle, cam)
    const wall = g.ghosts.find((x) => x.def.id === 'wall1')
    expect(wall?.present).toBe(false)
    for (let i = 0; i < 120 && g.player.pos.z > -34.2; i++)
      g.step(FIXED_DT, { x: 0, y: -1, jump: false, interact: false }, cam)
    expect(g.player.pos.z).toBeLessThan(-33.8)
    g.player.yaw = 0
    g.player.pitch = -0.6
    run(g, 0.3, idle, cam)
    tap(g, cam)
    expect(g.held).toBeNull()
    run(g, 1.5, idle, cam)
    expect(g.flags.all.has('loop:anchor')).toBe(true)

    // Back out of the niche with the wall behind us, then on west through the far end.
    g.player.yaw = 0
    for (let i = 0; i < 120 && g.player.pos.z < -32.6; i++)
      g.step(FIXED_DT, { x: 0, y: -1, jump: false, interact: false }, cam)
    g.player.pitch = 0
    g.player.yaw = Math.PI / 2
    follow(g, [[24.6, -32.0], [25.8, -32.0], ...bayWest(26).slice(0, 4)])
    expect(g.flags.all.has('loop:odd')).toBe(true)
    follow(g, [...bayWest(26).slice(4), ...bayWest(36).slice(0, 4), [44.3, -32], [48.5, -32]])
    run(g, 0.3, idle, cam)

    expect(events).toContain('solve')
    expect(g.flags.persistent.has('sigil:loop')).toBe(true)

    // Home: east through the open end door, the corridor and the Atrium doorway.
    g.player.yaw = -Math.PI / 2
    follow(g, [
      [44.3, -32],
      ...bayEast(36),
      ...bayEast(26),
      ...bayEast(16),
      ...bayEast(6),
      [1, -32],
    ])
    run(g, 1.5, { ...idle, y: 1 }, cam)
    expect(g.area).toBe('atrium')
  })
})

describe('loop: secret', () => {
  it('walking back east three times on an odd pass reveals fig. 07, which has a way out', () => {
    const g = fresh()
    const events: string[] = []
    g.on((e) => {
      if (e.name === 'custom') events.push(e.id)
    })
    firstLap(g)
    g.player.yaw = -Math.PI / 2
    // Each backward lap: from the landing next to the far end east to the trigger.
    const lap: [number, number][] = [
      [22.0, -31.5],
      [21.5, -32.6],
      [20.4, -32.6],
      [19.0, -31.5],
      [16.8, -31.5],
      [15.0, -31.5],
    ]
    walkTo(g, 15.4, -31.5)
    for (let i = 0; i < 3; i++) {
      expect(g.flags.persistent.has('secret:loop')).toBe(false)
      if (i === 0) run(g, 0.5, { ...idle, y: 1 }, cam)
      else follow(g, lap)
      run(g, 0.5, { ...idle, y: 1 }, cam)
      if (i < 2) expect(g.flags.all.has(i === 0 ? 'loop:b1' : 'loop:b2')).toBe(true)
    }
    expect(g.flags.persistent.has('secret:loop')).toBe(true)
    expect(events).toContain('secret')
    expect(g.player.pos.x).toBeLessThan(-86.6)
    expect(g.player.pos.x).toBeGreaterThan(-102)
    expect(g.area).toBe('loop')
    // Arrival keeps the heading (east, toward the header caption); the exit is behind us.
    expect(g.player.yaw).toBeCloseTo(-Math.PI / 2)
    g.player.yaw = Math.PI / 2
    walkTo(g, X0 + 100.5, -33)
    run(g, 0.5, { ...idle, y: 1 }, cam)
    expect(uOf(g)).toBeLessThan(6)
    expect(g.flags.all.has('loop:odd')).toBe(false)
    g.player.yaw = -Math.PI / 2
    run(g, 3, { ...idle, y: 1 }, cam)
    expect(g.area).toBe('atrium')
  })

  it('on an even pass the way back east is just the way home', () => {
    const g = fresh()
    follow(g, [[3, -32], ...bayWest(6), [16.5, -31.5]])
    g.player.yaw = -Math.PI / 2
    follow(g, [...bayEast(6), [1, -32]])
    run(g, 1.5, { ...idle, y: 1 }, cam)
    expect(g.area).toBe('atrium')
    expect(g.flags.persistent.has('secret:loop')).toBe(false)
  })
})

describe('loop: reset', () => {
  it('restores the cube, parity and anchor; keeps persistent progress', () => {
    const g = fresh()
    firstLap(g)
    follow(g, [
      [15.4, -31.5],
      [18.5, -31.5],
    ])
    g.player.yaw = Math.PI
    g.player.pitch = -0.5
    run(g, 1, idle, cam)
    tap(g, cam)
    expect(g.held).not.toBeNull()
    g.setFlag('loop:b1')
    g.setFlag('sigil:loop', true, true)

    g.resetArea('loop')
    expect(g.held).toBeNull()
    expect(g.flags.all.has('loop:odd')).toBe(false)
    expect(g.flags.all.has('loop:b1')).toBe(false)
    expect(g.flags.persistent.has('sigil:loop')).toBe(true)
    const cube = g.cubes[0]
    expect(cube.pos.x).toBeCloseTo(home(18.5))
    expect(cube.pos.z).toBeCloseTo(-29.5)
    expect(uOf(g)).toBeLessThan(6)
    run(g, 1, idle, cam)
    // The puzzle works again from scratch: the vault is shut.
    expect(g.doors.find((d) => d.def.id === 'vault1')?.solid).toBe(true)
  })
})
