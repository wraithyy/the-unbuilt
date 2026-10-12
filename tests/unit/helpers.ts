import { PerspectiveCamera } from 'three'
import { FIXED_DT, type Game } from '../../src/gameplay/game'
import type { AreaDef, BoxDef, Vec3 } from '../../src/world/types'

export function box(min: Vec3, max: Vec3, extra: Partial<BoxDef> = {}): BoxDef {
  return { min, max, ...extra }
}

/** 20x6x20 closed room centered on origin, floor top at y = 0. */
export function room(id = 'test', over: Partial<AreaDef> = {}): AreaDef {
  return {
    id,
    bounds: { min: [-12, -5, -12], max: [12, 10, 12] },
    spawn: { pos: [0, 0.9, 0], yaw: 0 },
    boxes: [
      box([-10, -1, -10], [10, 0, 10]),
      box([-10, 6, -10], [10, 7, 10]),
      box([-11, 0, -10], [-10, 6, 10]),
      box([10, 0, -10], [11, 6, 10]),
      box([-10, 0, -11], [10, 6, -10]),
      box([-10, 0, 10], [10, 6, 11]),
    ],
    entities: [],
    triggers: [],
    ...over,
  }
}

export function camera() {
  const c = new PerspectiveCamera(70, 16 / 9, 0.05, 200)
  c.updateProjectionMatrix()
  return c
}

export interface Move {
  x: number
  y: number
  jump: boolean
  interact: boolean
  eyesClosed?: boolean
}

export const idle: Move = { x: 0, y: 0, jump: false, interact: false }

export function run(g: Game, seconds: number, move: Move = idle, cam = camera()) {
  const n = Math.round(seconds / FIXED_DT)
  for (let i = 0; i < n; i++) g.step(FIXED_DT, move, cam)
}

export function tap(g: Game, cam = camera()) {
  g.step(FIXED_DT, { ...idle, interact: true }, cam)
}
