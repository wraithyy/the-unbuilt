import { Vector3 } from 'three'
import type { Vec3 } from '../world/types'

// Seamless teleports: both sides of a portal are built from identical geometry, so a
// rigid transform (translation + quarter turn about Y) is invisible to the player.

const tmp = new Vector3()

export function rotateY(v: Vector3, deg: number) {
  const r = (deg * Math.PI) / 180
  const c = Math.round(Math.cos(r))
  const s = Math.round(Math.sin(r))
  const x = v.x * c + v.z * s
  const z = -v.x * s + v.z * c
  return v.set(x, v.y, z)
}

/** p' = to + rotY(p - from). Mutates p. */
export function transformPoint(p: Vector3, from: Vec3, to: Vec3, rotY = 0) {
  tmp.set(p.x - from[0], p.y - from[1], p.z - from[2])
  rotateY(tmp, rotY)
  return p.set(tmp.x + to[0], tmp.y + to[1], tmp.z + to[2])
}

export function transformYaw(yaw: number, rotY = 0) {
  return yaw + (rotY * Math.PI) / 180
}
