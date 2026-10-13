import { Box3, Frustum, Matrix4, type PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { moveBox, overlaps, overlapsAny, raycast } from '../engine/collision'
import {
  cameraPose,
  createPlayer,
  eyePos,
  type Player,
  resetFrame,
  setGravity,
  stepPlayer,
  viewDir,
} from '../engine/player'
import type {
  Action,
  AlignDef,
  AnamorphDef,
  AreaDef,
  BoxDef,
  CaptionDef,
  CubeDef,
  DoorDef,
  GhostDef,
  GravityDir,
  PlateDef,
  TriggerDef,
  Vec3,
} from '../world/types'
import { GRAVITY, gravityAxis, gravityVector } from './gravity'
import { createObserved, inView, type Observed, stepObserved } from './observation'
import { grabRatio, type Held, type Placement, placeHeld } from './perspective'
import { rotateY, transformPoint } from './portals'
import { clearTransient, createFlags, evalCond, type Flags, setFlag } from './progression'

// The simulation. Everything per-frame lives here as plain mutable objects (no React).
// Mutation is deliberate: the sim runs at 60 Hz and must not allocate.

/** Meters walked per footstep sound (about 2.5 steps per second at walking speed). */
const STRIDE = 1.7

export type GameEvent =
  | { name: 'ghost'; id: string; present: boolean }
  | { name: 'teleport' }
  | { name: 'plate'; id: string; pressed: boolean }
  | { name: 'door'; id: string; open: boolean }
  | { name: 'grab' | 'drop' | 'blocked' }
  | { name: 'gravity'; dir: GravityDir; instant: boolean }
  | { name: 'checkpoint' }
  | { name: 'flag'; flag: string; value: boolean; persist: boolean }
  | { name: 'respawn' }
  | { name: 'align'; id: string; aligned: boolean }
  | { name: 'area'; id: string }
  | { name: 'ending' }
  | { name: 'eyes'; closed: boolean }
  | { name: 'step' | 'land' }
  | { name: 'custom'; id: string }

export interface StaticBox {
  def: BoxDef
  area: string
  box: Box3
  active: boolean
}

export interface CubeState {
  def: CubeDef
  area: string
  pos: Vector3
  half: Vector3
  size: number
  box: Box3
  vel: number
  held: boolean
  alive: boolean
  creepIndex: number
  creeping: boolean
  /** Seconds spent outside every area's bounds. */
  lost: number
  obs: Observed
}

export interface PlateState {
  def: PlateDef
  area: string
  box: Box3
  flag: string
  pressed: boolean
}

export interface DoorState {
  def: DoorDef
  area: string
  closed: Box3
  box: Box3
  open: number
  solid: boolean
}

export interface GhostState {
  def: GhostDef
  area: string
  box: Box3
  obs: Observed
  present: boolean
  /** Seconds since last flip (drives the accent flash). */
  since: number
}

export interface AlignState {
  def: AlignDef
  area: string
  box: Box3
  flag: string
  solid: boolean
}

export interface AnamorphState {
  def: AnamorphDef
  area: string
  visible: boolean
  read: boolean
  /** 0 = scattered, 1 = assembled (eases up after reading). */
  assembled: number
}

export interface TriggerState {
  def: TriggerDef
  area: string
  box: Box3
  inside: boolean
  fired: boolean
}

export interface CaptionState {
  def: CaptionDef
  area: string
  visible: boolean
}

export interface GameOptions {
  reducedMotion: boolean
}

export interface SaveSnapshot {
  flags: string[]
  checkpoint: { pos: Vec3; yaw: number; gravity: GravityDir }
}

export type Prompt = 'grab' | 'drop' | 'blocked' | null

export const FIXED_DT = 1 / 60
/** How close to the vantage eye, and how directly at the panel, reading requires. */
export const ANAMORPH_RADIUS = 1.1
export const ANAMORPH_COS = Math.cos((12 * Math.PI) / 180)

const toBox = (b: { min: Vec3; max: Vec3 }) =>
  new Box3(new Vector3(...b.min), new Vector3(...b.max))

const v1 = new Vector3()
const v2 = new Vector3()
const eye = new Vector3()
const dir = new Vector3()
const gvec = new Vector3()
const projView = new Matrix4()
const camPos = new Vector3()
const camQuat = new Quaternion()
const occupied = new Box3()

export class Game {
  readonly areas: AreaDef[]
  readonly player: Player
  readonly flags: Flags
  readonly statics: StaticBox[] = []
  readonly cubes: CubeState[] = []
  readonly plates: PlateState[] = []
  readonly doors: DoorState[] = []
  readonly ghosts: GhostState[] = []
  readonly aligns: AlignState[] = []
  readonly triggers: TriggerState[] = []
  readonly captions: CaptionState[] = []
  readonly anamorphs: AnamorphState[] = []
  /** Rebuilt every step: everything currently solid. */
  readonly solids: Box3[] = []
  readonly playerBox = new Box3()
  readonly frustum = new Frustum()
  readonly options: GameOptions
  checkpoint: { pos: Vec3; yaw: number; gravity: GravityDir }
  area: string
  held: CubeState | null = null
  heldInfo: Held = { scalable: false, ratio: 1, size: 1 }
  heldPlacement: Placement = { t: 1, size: 1, fits: false }
  prompt: Prompt = null
  /** With eyes closed nothing is observed: the world shows its unwatched state. */
  eyesClosed = false
  time = 0
  /** Ground distance walked since the last footstep. */
  private stride = 0
  private lostFor = 0
  private listeners: ((e: GameEvent) => void)[] = []

  constructor(
    areas: AreaDef[],
    save?: SaveSnapshot,
    options: GameOptions = { reducedMotion: false },
  ) {
    this.areas = areas
    this.options = options
    this.flags = createFlags(save?.flags)
    const first = areas[0]
    this.checkpoint = save?.checkpoint ?? {
      pos: first.spawn.pos,
      yaw: first.spawn.yaw,
      gravity: first.gravity ?? '-y',
    }
    // A save from an older world layout may point nowhere; start over at the first spawn.
    if (save && !this.areaAt(new Vector3(...save.checkpoint.pos)))
      this.checkpoint = {
        pos: first.spawn.pos,
        yaw: first.spawn.yaw,
        gravity: first.gravity ?? '-y',
      }
    this.player = createPlayer(this.checkpoint.pos, this.checkpoint.yaw, this.checkpoint.gravity)
    for (const a of areas) this.load(a)
    this.area = this.areaAt(this.player.pos) ?? first.id
    this.refreshActive()
  }

  on(fn: (e: GameEvent) => void) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private emit(e: GameEvent) {
    for (const l of this.listeners) l(e)
  }

  private load(a: AreaDef) {
    for (const def of a.boxes) this.statics.push({ def, area: a.id, box: toBox(def), active: true })
    for (const t of a.triggers)
      this.triggers.push({ def: t, area: a.id, box: toBox(t.box), inside: false, fired: false })
    for (const e of a.entities) {
      switch (e.type) {
        case 'cube':
          this.cubes.push(this.makeCube(e, a.id))
          break
        case 'plate':
          this.plates.push({
            def: e,
            area: a.id,
            box: toBox(e.box),
            flag: e.flag ?? `${a.id}.${e.id}`,
            pressed: false,
          })
          break
        case 'door': {
          const closed = toBox(e.box)
          this.doors.push({ def: e, area: a.id, closed, box: closed.clone(), open: 0, solid: true })
          break
        }
        case 'ghost':
          this.ghosts.push({
            def: e,
            area: a.id,
            box: toBox(e.box),
            obs: createObserved(true),
            present: e.present === 'seen',
            since: 99,
          })
          break
        case 'align':
          this.aligns.push({
            def: e,
            area: a.id,
            box: toBox(e.box),
            flag: e.flag ?? `${a.id}.${e.id}`,
            solid: false,
          })
          break
        case 'caption':
          this.captions.push({ def: e, area: a.id, visible: true })
          break
        case 'anamorph':
          this.anamorphs.push({ def: e, area: a.id, visible: true, read: false, assembled: 0 })
          break
      }
    }
  }

  private makeCube(def: CubeDef, area: string): CubeState {
    const pos = new Vector3(...def.pos)
    const half = new Vector3().setScalar(def.size / 2)
    return {
      def,
      area,
      pos,
      half,
      size: def.size,
      box: new Box3().setFromCenterAndSize(pos, half.clone().multiplyScalar(2)),
      vel: 0,
      held: false,
      alive: true,
      creepIndex: 0,
      creeping: !!def.creep,
      lost: 0,
      obs: createObserved(true),
    }
  }

  areaAt(p: Vector3): string | null {
    for (const a of this.areas) {
      const b = a.bounds
      if (
        p.x >= b.min[0] &&
        p.x <= b.max[0] &&
        p.y >= b.min[1] &&
        p.y <= b.max[1] &&
        p.z >= b.min[2] &&
        p.z <= b.max[2]
      )
        return a.id
    }
    return null
  }

  getArea(id = this.area) {
    return this.areas.find((a) => a.id === id)
  }

  // ---------------------------------------------------------------- per step

  /** Look is applied per render frame for responsiveness; movement in fixed steps. */
  step(
    dt: number,
    move: { x: number; y: number; jump: boolean; interact: boolean; eyesClosed?: boolean },
    camera: PerspectiveCamera,
  ) {
    this.time += dt
    if (!!move.eyesClosed !== this.eyesClosed) {
      this.eyesClosed = !!move.eyesClosed
      this.emit({ name: 'eyes', closed: this.eyesClosed })
    }
    this.refreshActive()
    this.rebuildSolids(null)

    const airBefore = this.player.grounded ? 0 : this.player.airTime
    stepPlayer(this.player, move, dt, this.solids)
    this.stepFootfall(dt, airBefore)
    this.updatePlayerBox()
    this.updateFrustum(camera)

    this.stepTriggers()
    this.stepCubes(dt)
    this.stepPlates()
    this.stepDoors(dt)
    this.stepGhosts(dt)
    this.stepAligns()
    this.stepAnamorphs(dt)
    this.stepHeld(move.interact)
    this.stepArea(dt)
  }

  private stepFootfall(dt: number, airBefore: number) {
    const p = this.player
    if (!p.grounded) return
    // Stairs and step-downs leave the ground for a few frames; only real falls land.
    if (airBefore > 0.25) {
      this.stride = 0
      this.emit({ name: 'land' })
      return
    }
    this.stride += p.vel.length() * dt
    if (this.stride >= STRIDE) {
      this.stride -= STRIDE
      this.emit({ name: 'step' })
    }
  }

  updatePlayerBox() {
    this.playerBox.min.copy(this.player.pos).sub(this.player.half)
    this.playerBox.max.copy(this.player.pos).add(this.player.half)
  }

  updateFrustum(camera: PerspectiveCamera) {
    cameraPose(this.player, camPos, camQuat)
    camera.position.copy(camPos)
    camera.quaternion.copy(camQuat)
    camera.updateMatrixWorld()
    projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(projView)
  }

  private refreshActive() {
    const f = this.flags.all
    for (const s of this.statics) s.active = evalCond(s.def.when, f)
    for (const c of this.cubes) {
      const alive = evalCond(c.def.when, f)
      if (!alive && c.held) {
        this.held = null
        c.held = false
      }
      c.alive = alive
    }
    for (const c of this.captions) c.visible = evalCond(c.def.when, f)
    for (const a of this.anamorphs) {
      a.visible = evalCond(a.def.when, f)
      if (!a.read && f.has(`read:${a.def.id}`)) {
        a.read = true
        a.assembled = 1
      }
    }
  }

  /** Collects solids; `skip` cube is left out (and the held cube always is). */
  private rebuildSolids(skip: CubeState | null) {
    const s = this.solids
    s.length = 0
    for (const b of this.statics) if (b.active) s.push(b.box)
    for (const d of this.doors) if (d.solid) s.push(d.box)
    for (const g of this.ghosts) if (g.present) s.push(g.box)
    for (const a of this.aligns) if (a.solid) s.push(a.box)
    for (const c of this.cubes) if (c.alive && !c.held && c !== skip) s.push(c.box)
  }

  private isOccupied(box: Box3, ignore?: CubeState) {
    occupied.copy(box).expandByScalar(0.04)
    if (occupied.intersectsBox(this.playerBox)) return true
    for (const c of this.cubes) {
      if (c === ignore || !c.alive || c.held) continue
      if (overlaps(c.box.min, c.box.max, occupied)) return true
    }
    return false
  }

  /**
   * Something rests on the box (gravity-aware): it must not vanish from under it.
   * Touching it from the side does not count, so leaning on a wall never pins it.
   */
  private isSupporting(box: Box3) {
    occupied.copy(box)
    const ga = gravityAxis(this.player.gravity)
    const upSign = -Math.sign(gravityVector(this.player.gravity, v1).getComponent(ga))
    if (upSign > 0) occupied.max.setComponent(ga, occupied.max.getComponent(ga) + 0.06)
    else occupied.min.setComponent(ga, occupied.min.getComponent(ga) - 0.06)
    return this.overlapsOccupant(occupied)
  }

  /** Strict overlap with the player or a resting cube: appearing here would trap it. */
  private overlapsOccupant(box: Box3) {
    if (overlaps(this.playerBox.min, this.playerBox.max, box)) return true
    for (const c of this.cubes) {
      if (!c.alive || c.held) continue
      if (overlaps(c.box.min, c.box.max, box)) return true
    }
    return false
  }

  private stepTriggers() {
    const f = this.flags.all
    for (const t of this.triggers) {
      const inside =
        evalCond(t.def.when, f) && overlaps(this.playerBox.min, this.playerBox.max, t.box)
      const entered = inside && !t.inside
      t.inside = inside
      if (!entered) continue
      if (t.def.once && t.fired) continue
      if (t.def.dir) {
        const d = t.def.dir
        const dot = this.player.vel.x * d[0] + this.player.vel.y * d[1] + this.player.vel.z * d[2]
        // A trigger with a direction must be entered moving that way; re-arm so a later
        // correct entry still fires.
        if (dot <= 0) {
          t.inside = false
          continue
        }
      }
      t.fired = true
      for (const a of t.def.actions) this.run(a)
      // Teleport moves the player; refresh contact so other triggers see the new place.
      this.updatePlayerBox()
    }
  }

  run(a: Action) {
    const p = this.player
    switch (a.type) {
      case 'teleport': {
        const rot = a.rotY ?? 0
        transformPoint(p.pos, a.from, a.to, rot)
        rotateY(p.vel, rot)
        if (rot !== 0) {
          camQuat.setFromAxisAngle(v1.set(0, 1, 0), (rot * Math.PI) / 180)
          p.frame.premultiply(camQuat)
          p.view.premultiply(camQuat)
          p.viewFrom.premultiply(camQuat)
        }
        // Triggers at the destination should not count as freshly entered.
        this.updatePlayerBox()
        for (const t of this.triggers)
          t.inside = overlaps(this.playerBox.min, this.playerBox.max, t.box)
        this.emit({ name: 'teleport' })
        break
      }
      case 'flag':
        this.setFlag(a.flag, a.value ?? true, a.persist ?? false)
        break
      case 'checkpoint':
        this.checkpoint = { pos: a.pos, yaw: a.yaw, gravity: p.gravity }
        this.emit({ name: 'checkpoint' })
        break
      case 'gravity': {
        this.rebuildSolids(null)
        const instant = this.options.reducedMotion
        if (setGravity(p, a.dir, this.solids, instant))
          this.emit({ name: 'gravity', dir: a.dir, instant })
        break
      }
      case 'event':
        this.emit({ name: 'custom', id: a.name })
        break
      case 'ending':
        this.emit({ name: 'ending' })
        break
    }
  }

  setFlag(flag: string, value = true, persist = false) {
    const had = this.flags.all.has(flag)
    const hadPersist = this.flags.persistent.has(flag)
    setFlag(this.flags, flag, value, persist)
    if (had !== value || (persist && !hadPersist)) this.emit({ name: 'flag', flag, value, persist })
  }

  private stepCubes(dt: number) {
    gravityVector(this.player.gravity, gvec)
    const ga = gravityAxis(this.player.gravity)
    for (const c of this.cubes) {
      if (!c.alive || c.held) continue
      if (c.creeping) {
        this.stepCreep(c, dt)
        continue
      }
      c.vel = Math.min(30, c.vel + GRAVITY * dt)
      this.rebuildSolids(c)
      this.solids.push(this.playerBox)
      v1.copy(gvec).multiplyScalar(c.vel * dt)
      const h = moveBox(c.pos, c.half, v1, this.solids)
      if (h.getComponent(ga) !== 0) c.vel = 0
      c.box.min.copy(c.pos).sub(c.half)
      c.box.max.copy(c.pos).add(c.half)
    }
    this.rebuildSolids(null)
  }

  private stepCreep(c: CubeState, dt: number) {
    const creep = c.def.creep
    if (!creep) return
    stepObserved(c.obs, this.sees(c.box), dt, false)
    if (c.obs.seen) return
    const target = creep.path[c.creepIndex]
    if (!target) {
      c.creeping = false
      return
    }
    v1.set(target[0], target[1], target[2]).sub(c.pos)
    const dist = v1.length()
    const stepLen = creep.speed * dt
    v2.copy(c.pos)
    if (dist <= stepLen) {
      c.pos.set(target[0], target[1], target[2])
      c.creepIndex++
    } else c.pos.addScaledVector(v1, stepLen / dist)
    c.box.min.copy(c.pos).sub(c.half)
    c.box.max.copy(c.pos).add(c.half)
    if (c.box.intersectsBox(this.playerBox)) {
      // Never creep into the player.
      c.pos.copy(v2)
      c.box.min.copy(c.pos).sub(c.half)
      c.box.max.copy(c.pos).add(c.half)
    }
    if (c.creepIndex >= creep.path.length) c.creeping = false
  }

  private stepPlates() {
    for (const p of this.plates) {
      const zone = occupied.copy(p.box).expandByScalar(0.03)
      let pressed = false
      for (const c of this.cubes) {
        if (!c.alive || c.held || c.size < (p.def.minSize ?? 0)) continue
        if (overlaps(c.box.min, c.box.max, zone)) pressed = true
      }
      if (p.def.accepts === 'any' && zone.intersectsBox(this.playerBox)) pressed = true
      if (pressed !== p.pressed) {
        p.pressed = pressed
        this.setFlag(p.flag, pressed)
        if (pressed && p.def.latch) this.setFlag(p.def.latch, true, true)
        this.emit({ name: 'plate', id: p.def.id, pressed })
      }
    }
  }

  private stepDoors(dt: number) {
    for (const d of this.doors) {
      const want = evalCond(d.def.openWhen, this.flags.all) ? 1 : 0
      if (want === d.open) continue
      const prev = d.open
      const next = want > d.open ? Math.min(1, d.open + dt * 2.2) : Math.max(0, d.open - dt * 2.2)
      const h = d.closed.max.y - d.closed.min.y
      v1.set(0, h * next, 0)
      d.box.copy(d.closed).translate(v1)
      // Closing never crushes the player or a cube; it waits.
      if (next < prev && this.isOccupied(d.box)) {
        d.box.copy(d.closed).translate(v1.set(0, h * prev, 0))
        continue
      }
      d.open = next
      d.solid = next < 0.98
      if (next === 1 || next === 0) this.emit({ name: 'door', id: d.def.id, open: next === 1 })
    }
  }

  private stepGhosts(dt: number) {
    for (const g of this.ghosts) {
      g.since += dt
      const gate = evalCond(g.def.when, this.flags.all)
      const pinned = g.present ? this.isSupporting(g.box) : this.overlapsOccupant(g.box)
      stepObserved(g.obs, this.sees(g.box), dt, pinned)
      const want = gate && (g.def.present === 'seen' ? g.obs.seen : !g.obs.seen)
      if (want === g.present) continue
      // Appearing inside something is never allowed; disappearing gated by `when` is.
      if (want ? this.overlapsOccupant(g.box) : this.isSupporting(g.box)) continue
      g.present = want
      g.since = 0
      this.emit({ name: 'ghost', id: g.def.id, present: want })
    }
  }

  private stepAligns() {
    eyePos(this.player, eye)
    viewDir(this.player, dir)
    for (const a of this.aligns) {
      const v = a.def.vantage
      const near = eye.distanceTo(v1.set(...v.pos)) <= v.radius
      v2.set(...v.lookAt)
        .sub(eye)
        .normalize()
      const looking = !this.eyesClosed && dir.dot(v2) >= Math.cos((v.coneDeg * Math.PI) / 180)
      const solid = (near && looking) || (a.solid && this.isOccupied(a.box))
      if (solid === a.solid) continue
      a.solid = solid
      this.setFlag(a.flag, solid)
      this.emit({ name: 'align', id: a.def.id, aligned: solid })
    }
  }

  private sees(box: Box3) {
    return !this.eyesClosed && inView(this.frustum, box)
  }

  private stepAnamorphs(dt: number) {
    eyePos(this.player, eye)
    viewDir(this.player, dir)
    for (const a of this.anamorphs) {
      if (!a.visible) continue
      if (a.read) {
        a.assembled = Math.min(1, a.assembled + dt / 3)
        continue
      }
      if (this.eyesClosed) continue
      const near = eye.distanceTo(v1.set(...a.def.vantage)) <= ANAMORPH_RADIUS
      v2.set(...a.def.center)
        .sub(eye)
        .normalize()
      if (!near || dir.dot(v2) < ANAMORPH_COS) continue
      a.read = true
      this.setFlag(`read:${a.def.id}`, true, true)
      this.emit({ name: 'custom', id: `read:${a.def.section}` })
    }
  }

  /** Soft-aim target: smallest angle inside a forgiving cone, with line of sight. */
  target(): CubeState | null {
    eyePos(this.player, eye)
    viewDir(this.player, dir)
    let best: CubeState | null = null
    let bestScore = Infinity
    for (const c of this.cubes) {
      if (!c.alive || c.held || c.creeping) continue
      v1.copy(c.pos).sub(eye)
      const dist = v1.length()
      if (dist > 3.2 + c.size) continue
      v1.divideScalar(dist)
      const angle = Math.acos(Math.min(1, v1.dot(dir)))
      const cone = Math.max(0.21, Math.atan((c.size * 0.6) / dist) + 0.1)
      if (angle > cone) continue
      const blockedAt = raycast(eye, v1, this.solids, dist, c.box)
      if (blockedAt < dist - c.size * 0.87) continue
      if (angle < bestScore) {
        bestScore = angle
        best = c
      }
    }
    return best
  }

  private stepHeld(interact: boolean) {
    const h = this.held
    if (!h) {
      const t = this.target()
      this.prompt = t ? 'grab' : null
      if (interact && t) this.grab(t)
      return
    }
    eyePos(this.player, eye)
    viewDir(this.player, dir)
    placeHeld(this.heldInfo, eye, dir, this.solids, this.playerBox, h.pos, this.heldPlacement)
    h.size = this.heldPlacement.size
    h.half.setScalar(h.size / 2)
    h.box.min.copy(h.pos).sub(h.half)
    h.box.max.copy(h.pos).add(h.half)
    this.prompt = this.heldPlacement.fits ? 'drop' : 'blocked'
    if (interact) this.drop()
  }

  grab(c: CubeState) {
    eyePos(this.player, eye)
    c.held = true
    c.vel = 0
    this.held = c
    this.heldInfo = {
      scalable: !!c.def.scalable,
      ratio: grabRatio(c.size, eye.distanceTo(c.pos)),
      size: c.size,
    }
    this.emit({ name: 'grab' })
  }

  drop() {
    const h = this.held
    if (!h) return
    if (!this.heldPlacement.fits) {
      this.emit({ name: 'blocked' })
      return
    }
    h.held = false
    this.held = null
    this.emit({ name: 'drop' })
  }

  private stepArea(dt: number) {
    const id = this.areaAt(this.player.pos)
    if (id && id !== this.area) {
      this.area = id
      this.recallStrayCubes(id)
      this.emit({ name: 'area', id })
    }
    for (let i = 0; i < this.cubes.length; i++) {
      const c = this.cubes[i]
      if (c.held || !c.alive) continue
      c.lost = this.areaAt(c.pos) ? 0 : c.lost + dt
      if (c.lost > 2) this.cubes[i] = this.makeCube(c.def, c.area)
    }
    this.lostFor = id ? 0 : this.lostFor + dt
    if (this.lostFor > 1.2) this.respawn()
  }

  /** Cubes carried out of their area return home when the player comes back for them. */
  private recallStrayCubes(id: string) {
    for (let i = 0; i < this.cubes.length; i++) {
      const c = this.cubes[i]
      if (c.area !== id || c.held || this.areaAt(c.pos) === id) continue
      this.cubes[i] = this.makeCube(c.def, id)
    }
  }

  // ---------------------------------------------------------------- control

  respawn() {
    const p = this.player
    const c = this.checkpoint
    this.held = null
    for (const cube of this.cubes) cube.held = false
    resetFrame(p, c.gravity)
    p.pos.set(...c.pos)
    p.vel.set(0, 0, 0)
    p.yaw = c.yaw
    p.pitch = 0
    this.lostFor = 0
    this.updatePlayerBox()
    for (const t of this.triggers)
      t.inside = overlaps(this.playerBox.min, this.playerBox.max, t.box)
    this.emit({ name: 'respawn' })
  }

  /** Restores the current area's puzzle state and returns to the checkpoint. */
  resetArea(id = this.area) {
    clearTransient(this.flags)
    for (let i = 0; i < this.cubes.length; i++) {
      const c = this.cubes[i]
      if (c.area === id) this.cubes[i] = this.makeCube(c.def, id)
    }
    for (const t of this.triggers) if (t.area === id) t.fired = false
    for (const g of this.ghosts) if (g.area === id) g.obs = createObserved(true)
    for (const a of this.aligns) if (a.area === id) a.solid = false
    for (const pl of this.plates) pl.pressed = false
    this.respawn()
  }

  snapshot(): SaveSnapshot {
    return { flags: [...this.flags.persistent], checkpoint: this.checkpoint }
  }

  /** Debug/e2e: teleport anywhere. */
  warp(pos: Vec3, yaw = this.player.yaw) {
    this.player.pos.set(...pos)
    this.player.vel.set(0, 0, 0)
    this.player.yaw = yaw
    this.updatePlayerBox()
    for (const t of this.triggers)
      t.inside = overlaps(this.playerBox.min, this.playerBox.max, t.box)
  }

  /** Test helper: is a point inside any solid. */
  solidAt(p: Vec3, half = 0.01) {
    return overlapsAny(v1.set(...p), v2.setScalar(half), this.solids)
  }
}
