import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { basis, eyePos } from '../../src/engine/player'
import { Game } from '../../src/gameplay/game'
import { SIGILS } from '../../src/gameplay/progression'
import { atrium } from '../../src/world/areas/atrium'
import { convergence } from '../../src/world/areas/convergence'
import { ending } from '../../src/world/areas/ending'
import type { Vec3 } from '../../src/world/types'
import { camera, run, tap } from './helpers'

const cam = camera()
const fwd = new Vector3()
const right = new Vector3()

/** Points the view at a world point, in whatever gravity frame is active. */
function lookAt(g: Game, target: Vec3) {
  const eye = eyePos(g.player, new Vector3())
  const local = new Vector3(...target)
    .sub(eye)
    .normalize()
    .applyQuaternion(new Quaternion().copy(g.player.frame).invert())
  g.player.yaw = Math.atan2(-local.x, -local.z)
  g.player.pitch = Math.asin(Math.max(-1, Math.min(1, local.y)))
}

/** Movement intent that walks toward a world point regardless of where we look. */
function steer(g: Game, target: Vec3) {
  basis(g.player, fwd, right)
  const d = new Vector3(...target).sub(g.player.pos)
  d.addScaledVector(
    fwd.clone().cross(right).normalize(),
    -d.dot(fwd.clone().cross(right).normalize()),
  )
  d.normalize()
  return { x: d.dot(right), y: d.dot(fwd), jump: false, interact: false }
}

function walkTo(g: Game, target: Vec3, seconds: number, face?: Vec3) {
  const n = Math.round(seconds * 60)
  for (let i = 0; i < n; i++) {
    if (face) lookAt(g, face)
    g.step(1 / 60, steer(g, target), cam)
  }
}

function newGame() {
  return new Game([atrium, convergence, ending], {
    flags: [...SIGILS],
    checkpoint: { pos: [0, 0.85, -25], yaw: 0, gravity: '-y' },
  })
}

describe('convergence', () => {
  it('can be solved end to end and reaches the ending', () => {
    const g = newGame()
    let ended = false
    g.on((e) => {
      if (e.name === 'ending') ended = true
    })
    run(g, 1.5, undefined, cam)
    expect(g.doors.find((d) => d.def.id === 'core')?.solid).toBe(false)

    // Larger inside: walking into the core lands in the long corridor.
    walkTo(g, [0, 0.85, -40], 2)
    expect(g.player.pos.z).toBeLessThan(-170)
    expect(g.area).toBe('convergence')
    walkTo(g, [0, 0.85, -203], 6)
    walkTo(g, [-18.5, 0.85, -203], 6)

    // Watching the stair removes it.
    lookAt(g, [-18.5, 2, -207])
    run(g, 0.5, undefined, cam)
    const absent = g.ghosts.filter((s) => s.def.id.startsWith('stair') && !s.present)
    expect(absent.length).toBeGreaterThanOrEqual(7)

    // Climb it backwards, looking away.
    walkTo(g, [-18.5, 5, -212], 5, [-18.5, 1.5, -190])
    expect(g.player.pos.y).toBeGreaterThan(4.9)

    // Grow the seed by placing it far away on the plate.
    walkTo(g, [-17.5, 5, -211.8], 1)
    lookAt(g, [-17.5, 4.4, -213])
    run(g, 0.1, undefined, cam)
    tap(g, cam)
    expect(g.held?.def.id).toBe('seed')
    lookAt(g, [0, 0, -212])
    run(g, 0.1, undefined, cam)
    expect(g.heldPlacement.size).toBeGreaterThan(2)
    tap(g, cam)
    run(g, 3, undefined, cam)
    expect(g.flags.persistent.has('convergence:opened')).toBe(true)

    // Back down the stair (looking away again), into the tower, fall up.
    walkTo(g, [-18.5, 0.85, -202], 6, [-18.5, 6, -230])
    walkTo(g, [0, 0.85, -208], 5)
    walkTo(g, [0, 0.85, -220], 3)
    run(g, 2.5, undefined, cam)
    expect(g.player.gravity).toBe('+y')
    expect(g.player.pos.y).toBeGreaterThan(22)

    // The oculus is sealed while watched.
    lookAt(g, [0, 24, -230])
    run(g, 0.4, undefined, cam)
    expect(g.ghosts.find((x) => x.def.id === 'oculus')?.present).toBe(true)

    // Back onto it, looking away: fall through into the unbuilt room.
    walkTo(g, [0, 23, -230], 4, [0, 20, -205])
    run(g, 1, undefined, cam)
    expect(g.area).toBe('ending')
    expect(g.player.gravity).toBe('-y')
    expect(g.flags.persistent.has('convergence:done')).toBe(true)

    walkTo(g, [0, 0.85, -286], 6)
    expect(ended).toBe(true)
  })

  it('core stays sealed without all sigils', () => {
    const g = new Game([atrium, convergence, ending], {
      flags: [SIGILS[0]],
      checkpoint: { pos: [0, 0.85, -25], yaw: 0, gravity: '-y' },
    })
    walkTo(g, [0, 0.85, -40], 3)
    expect(g.player.pos.z).toBeGreaterThan(-30)
  })

  it('ceiling strip restores normal gravity', () => {
    const g = newGame()
    g.setFlag('convergence:opened', true, true)
    g.warp([0, 0.85, -212], 0)
    run(g, 1.5, undefined, cam)
    walkTo(g, [0, 0.85, -220], 3)
    run(g, 2.5, undefined, cam)
    expect(g.player.gravity).toBe('+y')
    walkTo(g, [10, 23, -214], 6)
    run(g, 3, undefined, cam)
    expect(g.player.gravity).toBe('-y')
    expect(g.player.pos.y).toBeLessThan(1)
  })

  it('reset restores the seed', () => {
    const g = newGame()
    const seed = g.cubes.find((c) => c.def.id === 'seed')
    seed?.pos.set(0, 0, 0)
    g.resetArea('convergence')
    expect(g.cubes.find((c) => c.def.id === 'seed')?.pos.y).toBeCloseTo(4.4)
  })
})
