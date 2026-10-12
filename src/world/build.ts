import type { Box, BoxDef, Cond, Material, Vec3 } from './types'

// Small authoring helpers for area data. Everything is an axis-aligned box.

export function b(min: Vec3, max: Vec3, mat?: Material, when?: Cond): BoxDef {
  const def: BoxDef = { min, max }
  return { ...def, ...(mat ? { mat } : {}), ...(when !== undefined ? { when } : {}) }
}

export function box(min: Vec3, max: Vec3): Box {
  return { min, max }
}

/** n = -z wall, s = +z wall, w = -x wall, e = +x wall. */
export type Side = 'n' | 's' | 'e' | 'w'

export interface Gap {
  side: Side
  /** Center of the gap along the wall (x for n/s, z for e/w). */
  at: number
  width: number
  /** Gap top, measured from the interior floor. */
  height: number
}

export interface HollowOpts {
  /** Wall/floor/ceiling thickness. */
  t?: number
  gaps?: Gap[]
  floor?: boolean
  ceiling?: boolean
  mat?: Material
  floorMat?: Material
}

/**
 * Builds a room around the interior box [min, max]: floor, ceiling and four walls placed
 * outside the interior, with door-shaped gaps cut into walls.
 */
export function hollow(min: Vec3, max: Vec3, opts: HollowOpts = {}): BoxDef[] {
  const t = opts.t ?? 0.4
  const mat = opts.mat
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const out: BoxDef[] = []
  if (opts.floor !== false)
    out.push(b([x0 - t, y0 - t, z0 - t], [x1 + t, y0, z1 + t], opts.floorMat ?? mat))
  if (opts.ceiling !== false) out.push(b([x0 - t, y1, z0 - t], [x1 + t, y1 + t, z1 + t], mat))
  const gaps = opts.gaps ?? []
  const wall = (side: Side) => {
    const along = side === 'n' || side === 's' ? ([x0 - t, x1 + t] as const) : ([z0, z1] as const)
    const mine = gaps
      .filter((g) => g.side === side)
      .map((g) => [g.at - g.width / 2, g.at + g.width / 2, g.height] as const)
      .sort((a, c) => a[0] - c[0])
    const piece = (a0: number, a1: number, ya: number, yb: number) => {
      if (a1 - a0 < 1e-6 || yb - ya < 1e-6) return
      if (side === 'n') out.push(b([a0, ya, z0 - t], [a1, yb, z0], mat))
      if (side === 's') out.push(b([a0, ya, z1], [a1, yb, z1 + t], mat))
      if (side === 'w') out.push(b([x0 - t, ya, a0], [x0, yb, a1], mat))
      if (side === 'e') out.push(b([x1, ya, a0], [x1 + t, yb, a1], mat))
    }
    let cursor = along[0]
    for (const [g0, g1, gh] of mine) {
      piece(cursor, g0, y0, y1)
      piece(g0, g1, y0 + gh, y1)
      cursor = g1
    }
    piece(cursor, along[1], y0, y1)
  }
  for (const s of ['n', 's', 'e', 'w'] as const) wall(s)
  return out
}

/** Door-frame trim (two jambs + lintel) flush on a wall face, for readability. */
export function frame(
  side: Side,
  face: number,
  at: number,
  width: number,
  height: number,
  y0 = 0,
  mat: Material = 'accent',
  depth = 0.03,
  trim = 0.12,
): BoxDef[] {
  const w = width / 2
  // `face` is the wall surface coordinate; trim protrudes toward the interior.
  const dir = side === 'n' || side === 'w' ? 1 : -1
  const f0 = Math.min(face, face + dir * depth)
  const f1 = Math.max(face, face + dir * depth)
  const parts: [number, number, number, number][] = [
    [at - w - trim, at - w, y0, y0 + height + trim],
    [at + w, at + w + trim, y0, y0 + height + trim],
    [at - w - trim, at + w + trim, y0 + height, y0 + height + trim],
  ]
  return parts.map(([a0, a1, ya, yb]) =>
    side === 'n' || side === 's'
      ? b([a0, ya, f0], [a1, yb, f1], mat)
      : b([f0, ya, a0], [f1, yb, a1], mat),
  )
}
