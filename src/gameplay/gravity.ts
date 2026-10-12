import { Quaternion, Vector3 } from 'three'
import type { GravityDir } from '../world/types'

export const GRAVITY = 22
export const GRAVITY_TURN_SECONDS = 0.6

const DIRS: Record<GravityDir, readonly [number, number, number]> = {
  '-y': [0, -1, 0],
  '+y': [0, 1, 0],
  '-x': [-1, 0, 0],
  '+x': [1, 0, 0],
  '-z': [0, 0, -1],
  '+z': [0, 0, 1],
}

export function gravityVector(dir: GravityDir, out = new Vector3()): Vector3 {
  const d = DIRS[dir]
  return out.set(d[0], d[1], d[2])
}

/** "Up" is the opposite of the fall direction. */
export function upVector(dir: GravityDir, out = new Vector3()): Vector3 {
  return gravityVector(dir, out).negate()
}

/** Index of the axis gravity acts on (0 x, 1 y, 2 z). */
export function gravityAxis(dir: GravityDir): 0 | 1 | 2 {
  return dir[1] === 'x' ? 0 : dir[1] === 'y' ? 1 : 2
}

const Y = new Vector3(0, 1, 0)

/** Canonical frame orientation: rotates local +Y onto the up vector. */
export function baseFrame(dir: GravityDir, out = new Quaternion()): Quaternion {
  const up = upVector(dir)
  if (up.y < -0.5) return out.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI)
  return out.setFromUnitVectors(Y, up)
}

/**
 * Re-orients a frame for a gravity change with the smallest rotation, so the view
 * rolls with the new floor instead of snapping. For a 180° flip, rotates about `pivotAxis`
 * (the player's right vector) which reads as a forward somersault.
 */
export function turnFrame(
  frame: Quaternion,
  from: GravityDir,
  to: GravityDir,
  pivotAxis: Vector3,
): Quaternion {
  const a = upVector(from)
  const b = upVector(to)
  const q = new Quaternion()
  if (a.dot(b) < -0.5) q.setFromAxisAngle(pivotAxis.clone().normalize(), Math.PI)
  else q.setFromUnitVectors(a, b)
  return frame.premultiply(q)
}

export function isGravityDir(v: unknown): v is GravityDir {
  return typeof v === 'string' && v in DIRS
}
