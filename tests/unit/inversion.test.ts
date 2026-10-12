import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { basis } from '../../src/engine/player'
import { Game, type GameEvent } from '../../src/gameplay/game'
import { upVector } from '../../src/gameplay/gravity'
import { inversion } from '../../src/world/areas/inversion'
import { idle, run, tap } from './helpers'

type V3 = [number, number, number]
const step = (y: number, x = 0) => ({ ...idle, y, x })

function newGame(flags: string[] = []) {
  const g = new Game([inversion], {
    flags,
    checkpoint: { pos: inversion.spawn.pos, yaw: 0, gravity: '-y' },
  })
  const events: GameEvent[] = []
  g.on((e) => events.push(e))
  return { g, events }
}

/** Points the player's horizontal forward (in the current gravity frame) toward `dir`. */
function faceWorld(g: Game, dir: Vector3) {
  const f = new Vector3()
  const r = new Vector3()
  let best = 0
  let bestDot = -2
  for (let i = 0; i < 629; i++) {
    g.player.yaw = i / 100
    basis(g.player, f, r)
    const d = f.dot(dir)
    if (d > bestDot) {
      bestDot = d
      best = i / 100
    }
  }
  g.player.yaw = best
}

const inPlane = (g: Game, d: Vector3) => {
  const up = upVector(g.player.gravity)
  return d.clone().addScaledVector(up, -d.dot(up))
}

/** Walks (or backs, `back`) toward a world point, ignoring the gravity axis. */
function goto(g: Game, p: V3, tol = 0.3, back = false, maxT = 30) {
  const target = new Vector3(...p)
  for (let t = 0; t < maxT * 60; t++) {
    const d = inPlane(g, target.clone().sub(g.player.pos))
    if (d.length() < tol) return
    faceWorld(g, back ? d.negate() : d)
    run(g, 1 / 60, step(back ? -1 : 1))
  }
  throw new Error(`goto timed out at ${g.player.pos.toArray()} -> ${p}`)
}

function lookAt(g: Game, p: V3) {
  const eye = g.player.pos.clone().addScaledVector(upVector(g.player.gravity), 0.62)
  const local = new Vector3(...p)
    .sub(eye)
    .normalize()
    .applyQuaternion(new Quaternion().copy(g.player.frame).invert())
  g.player.yaw = Math.atan2(-local.x, -local.z)
  g.player.pitch = Math.asin(local.y)
}

function walkUntil(g: Game, move: ReturnType<typeof step>, done: () => boolean, maxT = 10) {
  for (let t = 0; t < maxT * 60 && !done(); t++) run(g, 1 / 60, move)
  expect(done()).toBe(true)
}

/** Floor -> west wall -> ceiling, optionally carrying the cube. */
function ascend(g: Game) {
  goto(g, [-8, 0.85, -68])
  faceWorld(g, new Vector3(-1, 0, 0))
  walkUntil(g, step(1), () => g.player.gravity === '-x')
  faceWorld(g, new Vector3(0, 1, 0))
  walkUntil(g, step(1), () => g.player.gravity === '+y')
  run(g, 0.5)
}

function grabCube(g: Game) {
  goto(g, [0, 0.85, -66])
  goto(g, [2, 0.85, -69.5], 1.5)
  lookAt(g, g.cubes[0].pos.toArray() as V3)
  tap(g)
  expect(g.held).toBe(g.cubes[0])
}

function placeCubeOnPlate(g: Game) {
  goto(g, [-3.5, 9.15, -70.5], 0.2)
  faceWorld(g, new Vector3(1, 0, 0))
  g.player.pitch = 0
  run(g, 0.3)
  tap(g)
  run(g, 1)
}

function solve(g: Game) {
  goto(g, [0, 0.85, -58])
  grabCube(g)
  ascend(g)
  placeCubeOnPlate(g)
}

describe('inversion: solve', () => {
  it('carry the cube up the wall onto the ceiling plate, take the sigil, come home upright', () => {
    const { g, events } = newGame()
    run(g, 0.3)
    solve(g)
    expect(g.flags.persistent.has('inversion:plated')).toBe(true)
    expect(g.player.gravity).toBe('+y')

    run(g, 1)
    // Back in through the doorway: looking away while passing the plug.
    goto(g, [0, 9.15, -76], 0.3)
    goto(g, [0, 9.15, -88], 0.3, true)
    expect(g.flags.persistent.has('sigil:inversion')).toBe(true)
    expect(events.some((e) => e.name === 'custom' && e.id === 'solve')).toBe(true)

    // Home: ceiling band -> west wall -> down to the floor corner -> corridor.
    goto(g, [0, 9.15, -76], 0.3)
    goto(g, [-11.6, 9.15, -68], 0.3)
    walkUntil(g, step(1), () => g.player.gravity === '-x', 4)
    faceWorld(g, new Vector3(0, -1, 0))
    walkUntil(g, step(1), () => g.player.gravity === '-y', 6)
    run(g, 0.5)
    expect(g.player.pos.y).toBeCloseTo(0.85, 1)
    goto(g, [0, 0.85, -64], 0.3)
    goto(g, [0, 0.85, -53], 0.3)
    expect(g.player.gravity).toBe('-y')
    expect(g.areaAt(g.player.pos)).toBe('inversion')
    expect(g.player.pos.z).toBeGreaterThan(-53.5)
  })

  it('the way up needs no jump and the cube follows the player through the turns', () => {
    const { g } = newGame()
    goto(g, [0, 0.85, -58])
    grabCube(g)
    ascend(g)
    expect(g.held).toBe(g.cubes[0])
    expect(g.player.pos.y).toBeGreaterThan(9)
  })
})

describe('inversion: gaze', () => {
  it('the doorway plug is solid while watched and lets you pass when looked away from', () => {
    const { g } = newGame(['inversion:plated'])
    g.run({ type: 'gravity', dir: '+y' })
    g.warp([0, 9.15, -75], 0)
    run(g, 0.3)
    faceWorld(g, new Vector3(0, 0, -1))
    run(g, 1.5, step(1))
    expect(g.ghosts[0].present).toBe(true)
    expect(g.player.pos.z).toBeGreaterThan(-79.8)

    g.warp([0, 9.15, -75], 0)
    faceWorld(g, new Vector3(0, 0, 1))
    run(g, 0.4)
    expect(g.ghosts[0].present).toBe(false)
    run(g, 1.5, step(-1))
    expect(g.player.pos.z).toBeLessThan(-81)
  })

  it('the door stays shut until the plate is latched', () => {
    const { g } = newGame()
    g.run({ type: 'gravity', dir: '+y' })
    g.warp([0, 9.15, -75], 0)
    faceWorld(g, new Vector3(0, 0, 1))
    run(g, 1)
    run(g, 2, step(-1))
    expect(g.player.pos.z).toBeGreaterThan(-80)
  })
})

describe('inversion: secret', () => {
  it('falling into the ceiling hole finds the history room, and there is a way back', () => {
    const { g, events } = newGame()
    goto(g, [0, 0.85, -58])
    ascend(g)
    goto(g, [4, 9.15, -74], 0.3)
    faceWorld(g, new Vector3(1, 0, 0))
    run(g, 1.5, step(1))
    expect(g.flags.persistent.has('secret:inversion')).toBe(true)
    expect(events.some((e) => e.name === 'custom' && e.id === 'secret')).toBe(true)
    expect(g.player.pos.y).toBeGreaterThan(12)

    // Upside-down up there: the red ceiling strip turns you upright.
    goto(g, [0, 13.55, -70], 0.4)
    run(g, 2)
    expect(g.player.gravity).toBe('-y')
    expect(g.player.pos.y).toBeCloseTo(11.25, 1)

    // The floor hole drops you home.
    goto(g, [8.5, 11.25, -74], 0.3)
    run(g, 3)
    expect(g.player.gravity).toBe('-y')
    expect(g.player.pos.y).toBeCloseTo(0.85, 1)
    expect(g.areaAt(g.player.pos)).toBe('inversion')
  })
})

describe('inversion: reset', () => {
  it('resetArea puts the cube back, restores -y and the checkpoint', () => {
    const { g } = newGame()
    goto(g, [0, 0.85, -58])
    grabCube(g)
    ascend(g)
    placeCubeOnPlate(g)
    expect(g.cubes[0].pos.y).toBeGreaterThan(9)
    g.resetArea('inversion')
    expect(g.cubes[0].pos.toArray()).toEqual([3, 0.35, -70])
    expect(g.held).toBeNull()
    expect(g.player.gravity).toBe('-y')
    expect(g.player.pos.z).toBeCloseTo(-57, 0)
    expect(g.plates[0].pressed).toBe(false)
    expect(g.flags.persistent.has('inversion:plated')).toBe(true)
  })

  it('respawn mid-climb restores -y, so a fall or reset cannot strand the player', () => {
    const { g } = newGame()
    ascend(g)
    g.respawn()
    run(g, 0.5)
    expect(g.player.gravity).toBe('-y')
    expect(g.player.pos.y).toBeCloseTo(0.85, 1)
  })
})

describe('inversion: no gravity ping-pong', () => {
  const cases: { name: string; gravity: '-y' | '-x' | '+y'; pos: V3 }[] = [
    { name: 'floor against the red wall', gravity: '-y', pos: [-11.3, 0.85, -68] },
    { name: 'wall bottom corner', gravity: '-x', pos: [-11.09, 0.3, -68] },
    { name: 'wall top corner', gravity: '-x', pos: [-11.09, 8.9, -68] },
    { name: 'ceiling at the wall', gravity: '+y', pos: [-11.5, 9.15, -68] },
    { name: 'ceiling band edge', gravity: '+y', pos: [-5, 9.15, -68] },
    { name: 'floor corner by the strip edge', gravity: '-y', pos: [-11.3, 0.85, -72.2] },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const { g, events } = newGame()
      g.run({ type: 'gravity', dir: c.gravity })
      g.warp(c.pos, 0)
      run(g, 1)
      const settled = g.player.gravity
      const before = events.filter((e) => e.name === 'gravity').length
      run(g, 3)
      expect(events.filter((e) => e.name === 'gravity').length).toBe(before)
      expect(g.player.gravity).toBe(settled)
      expect(before).toBeLessThanOrEqual(2)
    })
  }
})
