import { type Box3, Vector3 } from 'three'

// Axis-separated AABB movement. The world is entirely axis-aligned (including gravity),
// which keeps every puzzle deterministic and lets one tiny solver serve player and cubes.

const EPS = 1e-4
const tmpMin = new Vector3()
const tmpMax = new Vector3()
const AXES = ['x', 'y', 'z'] as const
export type Axis = 0 | 1 | 2

export function overlaps(aMin: Vector3, aMax: Vector3, b: Box3): boolean {
  return (
    aMin.x < b.max.x - EPS &&
    aMax.x > b.min.x + EPS &&
    aMin.y < b.max.y - EPS &&
    aMax.y > b.min.y + EPS &&
    aMin.z < b.max.z - EPS &&
    aMax.z > b.min.z + EPS
  )
}

export function overlapsAny(center: Vector3, half: Vector3, solids: readonly Box3[], skip?: Box3) {
  tmpMin.copy(center).sub(half)
  tmpMax.copy(center).add(half)
  for (const s of solids) if (s !== skip && overlaps(tmpMin, tmpMax, s)) return true
  return false
}

/** Signed contact per axis after a move: -1 hit on the negative side, +1 positive, 0 none. */
export const hit = new Vector3()

/**
 * Moves a box (center/half) by delta, resolving against solids one axis at a time.
 * Mutates `center` (hot path: no allocations) and writes contacts into `hit`.
 */
export function moveBox(
  center: Vector3,
  half: Vector3,
  delta: Vector3,
  solids: readonly Box3[],
  skip?: Box3,
): Vector3 {
  hit.set(0, 0, 0)
  const maxStep = Math.max(0.05, Math.min(half.x, half.y, half.z) * 0.5)
  const len = Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z))
  const steps = Math.min(32, Math.ceil(len / maxStep) || 1)
  for (let s = 0; s < steps; s++) {
    for (let a = 0; a < 3; a++) {
      const k = AXES[a]
      const d = delta[k] / steps
      if (d === 0) continue
      center[k] += d
      tmpMin.copy(center).sub(half)
      tmpMax.copy(center).add(half)
      for (const box of solids) {
        if (box === skip || !overlaps(tmpMin, tmpMax, box)) continue
        if (d > 0) center[k] = box.min[k] - half[k] - EPS
        else center[k] = box.max[k] + half[k] + EPS
        hit[k] = Math.sign(d)
        tmpMin.copy(center).sub(half)
        tmpMax.copy(center).add(half)
      }
    }
  }
  return hit
}

/** Ray vs AABB (slab test). Returns entry distance or Infinity. */
export function rayBox(origin: Vector3, dir: Vector3, box: Box3, maxDist: number): number {
  let tmin = 0
  let tmax = maxDist
  for (const k of AXES) {
    const o = origin[k]
    const d = dir[k]
    if (Math.abs(d) < 1e-9) {
      if (o < box.min[k] || o > box.max[k]) return Infinity
      continue
    }
    let t1 = (box.min[k] - o) / d
    let t2 = (box.max[k] - o) / d
    if (t1 > t2) {
      const t = t1
      t1 = t2
      t2 = t
    }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return Infinity
  }
  return tmin
}

export function raycast(
  origin: Vector3,
  dir: Vector3,
  solids: readonly Box3[],
  maxDist: number,
  skip?: Box3,
): number {
  let best = maxDist
  for (const s of solids) {
    if (s === skip) continue
    const t = rayBox(origin, dir, s, best)
    if (t < best) best = t
  }
  return best
}

/** Pushes a box out of solids along `up` (then -up) in small steps. Returns success. */
export function depenetrate(
  center: Vector3,
  half: Vector3,
  up: Vector3,
  solids: readonly Box3[],
  skip?: Box3,
): boolean {
  if (!overlapsAny(center, half, solids, skip)) return true
  const start = center.clone()
  for (const sign of [1, -1]) {
    for (let i = 1; i <= 40; i++) {
      center.copy(start).addScaledVector(up, sign * i * 0.05)
      if (!overlapsAny(center, half, solids, skip)) return true
    }
  }
  center.copy(start)
  return false
}
