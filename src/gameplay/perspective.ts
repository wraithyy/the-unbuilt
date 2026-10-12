import { type Box3, Vector3 } from 'three'
import { overlapsAny, raycast } from '../engine/collision'

// Forced perspective. A held scalable cube keeps the apparent size it had when grabbed:
// it is pushed along the view ray as far as it fits and scaled by distance
// (size = ratio * distance). Ordinary cubes are simply held at arm's length.

export const MIN_SIZE = 0.25
export const MAX_SIZE = 4
const MIN_T = 0.55
const MAX_T = 40

export interface Held {
  scalable: boolean
  /** size / distance at grab time (scalable only). */
  ratio: number
  /** Fixed edge length (non-scalable). */
  size: number
}

export interface Placement {
  t: number
  size: number
  fits: boolean
}

const half = new Vector3()
const extraList: Box3[] = []

function sizeAt(h: Held, t: number) {
  if (!h.scalable) return h.size
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, h.ratio * t))
}

/**
 * Finds where a held cube sits along the ray from `eye` in `dir`.
 * Writes the center into `out`. `extra` are solids that block placement but not the
 * view ray (the player's own box).
 */
export function placeHeld(
  h: Held,
  eye: Vector3,
  dir: Vector3,
  solids: readonly Box3[],
  extra: Box3,
  out: Vector3,
  result: Placement,
): Placement {
  const l1 = Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z)
  const reach = h.scalable ? MAX_T : 1.5 + h.size * 0.6
  const wall = raycast(eye, dir, solids, reach)
  // Largest t whose cube (support distance size/2 * l1 along the ray) stays before the wall.
  let t: number
  if (h.scalable) {
    t = wall / (1 + (h.ratio * l1) / 2)
    const s = h.ratio * t
    if (s > MAX_SIZE) t = wall - (MAX_SIZE / 2) * l1
    else if (s < MIN_SIZE) t = wall - (MIN_SIZE / 2) * l1
  } else {
    t = Math.min(reach, wall - (h.size / 2) * l1)
  }
  t = Math.max(MIN_T, t)

  let fits = false
  for (let i = 0; i < 24; i++) {
    const s = sizeAt(h, t)
    out.copy(eye).addScaledVector(dir, t)
    half.setScalar(s / 2)
    extraList[0] = extra
    if (!overlapsAny(out, half, solids) && !overlapsAny(out, half, extraList)) {
      fits = true
      break
    }
    // Looking steeply down puts the cube into the player's own box; slide it out along
    // the ground plane (perpendicular to the player's long axis) before giving up.
    if (!overlapsAny(out, half, solids) && nudgeOutOf(extra, out, half, solids)) {
      fits = true
      break
    }
    t *= 0.9
    if (t < MIN_T) break
  }
  result.t = t
  result.size = sizeAt(h, t)
  result.fits = fits
  return result
}

/** Ratio captured at grab time so the cube keeps its apparent size. */
export function grabRatio(size: number, distance: number) {
  return size / Math.max(0.1, distance)
}

const away = new Vector3()
const extraSize = new Vector3()
const extraCenter = new Vector3()

function nudgeOutOf(player: Box3, out: Vector3, half: Vector3, solids: readonly Box3[]) {
  player.getSize(extraSize)
  player.getCenter(extraCenter)
  const upAxis =
    extraSize.x > extraSize.y
      ? extraSize.x > extraSize.z
        ? 0
        : 2
      : extraSize.y > extraSize.z
        ? 1
        : 2
  away.copy(out).sub(extraCenter).setComponent(upAxis, 0)
  if (away.lengthSq() < 1e-6) return false
  away.normalize()
  extraList[0] = player
  for (let i = 1; i <= 12; i++) {
    out.addScaledVector(away, 0.1)
    if (overlapsAny(out, half, solids)) return false
    if (!overlapsAny(out, half, extraList)) return true
  }
  return false
}
