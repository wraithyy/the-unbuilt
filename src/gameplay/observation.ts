import { Box3, type Frustum } from 'three'

// Observation-dependent reality. A box counts as "seen" while any part of it is inside
// the camera frustum. State flips only after the new answer has been stable for
// HOLD seconds, and never while something occupies the volume (no traps, no flicker).

export const HOLD = 0.15

export interface Observed {
  seen: boolean
  /** Seconds the raw observation has disagreed with `seen`. */
  pending: number
}

export function createObserved(seen = true): Observed {
  return { seen, pending: 0 }
}

/**
 * Advances observation state. Returns true when `seen` flipped this step.
 * `blocked` = the volume is occupied, so the geometry must keep its current state.
 */
export function stepObserved(o: Observed, rawSeen: boolean, dt: number, blocked: boolean) {
  if (rawSeen === o.seen) {
    o.pending = 0
    return false
  }
  o.pending += dt
  if (o.pending < HOLD || blocked) return false
  o.seen = rawSeen
  o.pending = 0
  return true
}

const shrunk = new Box3()

/** Frustum test with a small inset so grazing the screen edge does not count. */
export function inView(frustum: Frustum, box: Box3) {
  shrunk.copy(box).expandByScalar(-0.02)
  return frustum.intersectsBox(shrunk)
}
