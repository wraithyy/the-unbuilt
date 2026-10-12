import { type Box3, Euler, Quaternion, Vector3 } from 'three'
import {
  baseFrame,
  GRAVITY,
  GRAVITY_TURN_SECONDS,
  gravityAxis,
  gravityVector,
  turnFrame,
  upVector,
} from '../gameplay/gravity'
import type { GravityDir } from '../world/types'
import { depenetrate, hit, moveBox, overlapsAny } from './collision'

// Kinematic first-person controller in an arbitrary axis-aligned gravity frame.

export const PLAYER_RADIUS = 0.3
export const PLAYER_HALF_HEIGHT = 0.85
const EYE_OFFSET = 0.62
const WALK_SPEED = 4.2
const GROUND_ACCEL = 34
const AIR_ACCEL = 9
const JUMP_SPEED = 7.2
const STEP_HEIGHT = 0.42
const COYOTE = 0.12
const PITCH_LIMIT = 1.5

export interface Player {
  pos: Vector3
  vel: Vector3
  half: Vector3
  yaw: number
  pitch: number
  gravity: GravityDir
  /** Orientation of the gravity frame (local +Y = up). */
  frame: Quaternion
  /** Smoothed frame used for the camera; eases toward `frame`. */
  view: Quaternion
  viewFrom: Quaternion
  turnT: number
  grounded: boolean
  airTime: number
}

export function createPlayer(pos: readonly number[], yaw: number, gravity: GravityDir = '-y') {
  const frame = baseFrame(gravity)
  const p: Player = {
    pos: new Vector3(pos[0], pos[1], pos[2]),
    vel: new Vector3(),
    half: new Vector3(),
    yaw,
    pitch: 0,
    gravity,
    frame,
    view: frame.clone(),
    viewFrom: frame.clone(),
    turnT: 1,
    grounded: false,
    airTime: 0,
  }
  updateHalf(p)
  return p
}

function updateHalf(p: Player) {
  p.half.set(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS)
  p.half.setComponent(gravityAxis(p.gravity), PLAYER_HALF_HEIGHT)
}

const up = new Vector3()
const down = new Vector3()
const fwd = new Vector3()
const right = new Vector3()
const wish = new Vector3()
const vUp = new Vector3()
const vFlat = new Vector3()
const delta = new Vector3()
const save = new Vector3()
const alt = new Vector3()
const contact = new Vector3()
const tmpQ = new Quaternion()
const euler = new Euler(0, 0, 0, 'YXZ')

/** Horizontal basis in the current gravity frame (forward ignores pitch). */
export function basis(p: Player, outFwd: Vector3, outRight: Vector3) {
  outFwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)).applyQuaternion(p.frame)
  outRight.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw)).applyQuaternion(p.frame)
}

export function look(p: Player, dx: number, dy: number, sensitivity: number, invertY: boolean) {
  p.yaw -= dx * sensitivity
  p.pitch -= dy * sensitivity * (invertY ? -1 : 1)
  p.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p.pitch))
}

export interface MoveIntent {
  x: number
  y: number
  jump: boolean
}

export function stepPlayer(p: Player, intent: MoveIntent, dt: number, solids: readonly Box3[]) {
  upVector(p.gravity, up)
  down.copy(up).negate()
  basis(p, fwd, right)

  wish.copy(right).multiplyScalar(intent.x).addScaledVector(fwd, intent.y)
  if (wish.lengthSq() > 1) wish.normalize()
  wish.multiplyScalar(WALK_SPEED)

  const vu = p.vel.dot(up)
  vUp.copy(up).multiplyScalar(vu)
  vFlat.copy(p.vel).sub(vUp)
  const accel = (p.grounded ? GROUND_ACCEL : AIR_ACCEL) * dt
  const diff = wish.sub(vFlat)
  const dl = diff.length()
  if (dl > accel) diff.multiplyScalar(accel / dl)
  vFlat.add(diff)

  let nu = vu - GRAVITY * dt
  if (intent.jump && (p.grounded || p.airTime < COYOTE)) {
    nu = JUMP_SPEED
    p.airTime = COYOTE
  }
  p.vel.copy(vFlat).addScaledVector(up, nu)

  delta.copy(p.vel).multiplyScalar(dt)
  save.copy(p.pos)
  moveBox(p.pos, p.half, delta, solids)
  contact.copy(hit)
  const blockedFlat = hasFlatHit(p.gravity)
  const ga = gravityAxis(p.gravity)
  const gsign = Math.sign(gravityVector(p.gravity, alt).getComponent(ga))
  let landed = hit.getComponent(ga) === gsign
  const bumped = hit.getComponent(ga) === -gsign

  if (blockedFlat && p.grounded) {
    // Step-up: retry from a raised position, then settle back down.
    alt.copy(save).addScaledVector(up, STEP_HEIGHT)
    if (!overlapsAny(alt, p.half, solids)) {
      delta.copy(vFlat).multiplyScalar(dt)
      moveBox(alt, p.half, delta, solids)
      delta.copy(down).multiplyScalar(STEP_HEIGHT + 0.05)
      moveBox(alt, p.half, delta, solids)
      const steppedLanded = hit.getComponent(ga) === gsign
      if (steppedLanded && flatDistSq(alt, save, up) > flatDistSq(p.pos, save, up) + 1e-6) {
        p.pos.copy(alt)
        contact.copy(hit)
        landed = true
      }
    }
  }

  if (landed) {
    p.grounded = true
    p.airTime = 0
    p.vel.addScaledVector(up, -p.vel.dot(up))
  } else {
    p.grounded = false
    p.airTime += dt
  }
  if (bumped && p.vel.dot(up) > 0) p.vel.addScaledVector(up, -p.vel.dot(up))
  // Flat velocity into walls is dropped so the player slides instead of sticking.
  for (let a = 0; a < 3; a++) {
    if (a !== ga && contact.getComponent(a) !== 0) p.vel.setComponent(a, 0)
  }

  if (p.turnT < 1) {
    p.turnT = Math.min(1, p.turnT + dt / GRAVITY_TURN_SECONDS)
    const t = p.turnT
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    p.view.slerpQuaternions(p.viewFrom, p.frame, eased)
  } else {
    p.view.copy(p.frame)
  }
}

function hasFlatHit(g: GravityDir) {
  const ga = gravityAxis(g)
  for (let a = 0; a < 3; a++) if (a !== ga && hit.getComponent(a) !== 0) return true
  return false
}

function flatDistSq(a: Vector3, b: Vector3, upv: Vector3) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  const u = dx * upv.x + dy * upv.y + dz * upv.z
  return dx * dx + dy * dy + dz * dz - u * u
}

/** Changes gravity; the camera rolls over GRAVITY_TURN_SECONDS (or instantly if `instant`). */
export function setGravity(
  p: Player,
  dir: GravityDir,
  solids: readonly Box3[],
  instant = false,
): boolean {
  if (dir === p.gravity) return false
  const prev = { gravity: p.gravity, pos: p.pos.clone(), half: p.half.clone() }
  p.gravity = dir
  updateHalf(p)
  if (!depenetrate(p.pos, p.half, upVector(dir, up), solids)) {
    p.gravity = prev.gravity
    p.pos.copy(prev.pos)
    p.half.copy(prev.half)
    return false
  }
  basis(p, fwd, right)
  p.viewFrom.copy(p.view)
  turnFrame(p.frame, prev.gravity, dir, right)
  p.vel.set(0, 0, 0)
  p.grounded = false
  p.turnT = instant ? 1 : 0
  if (instant) p.view.copy(p.frame)
  return true
}

/** Resets orientation to the canonical frame for `dir` (respawn). */
export function resetFrame(p: Player, dir: GravityDir) {
  p.gravity = dir
  baseFrame(dir, p.frame)
  p.view.copy(p.frame)
  p.turnT = 1
  updateHalf(p)
}

/** Writes eye position and camera orientation. */
export function cameraPose(p: Player, outPos: Vector3, outQuat: Quaternion) {
  up.set(0, 1, 0).applyQuaternion(p.view)
  outPos.copy(p.pos).addScaledVector(up, EYE_OFFSET)
  euler.set(p.pitch, p.yaw, 0)
  tmpQ.setFromEuler(euler)
  outQuat.copy(p.view).multiply(tmpQ)
}

/** Unit view direction (includes pitch), based on the settled frame. */
export function viewDir(p: Player, out: Vector3) {
  euler.set(p.pitch, p.yaw, 0)
  tmpQ.setFromEuler(euler)
  return out.set(0, 0, -1).applyQuaternion(tmpQ).applyQuaternion(p.frame)
}

export function eyePos(p: Player, out: Vector3) {
  return out.copy(p.pos).addScaledVector(upVector(p.gravity, up), EYE_OFFSET)
}
