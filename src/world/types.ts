// Level data contract. Areas are pure data; generic systems in src/gameplay interpret them.
// See docs/ENGINE.md for semantics and authoring rules.

export type Vec3 = readonly [number, number, number]

/** Axis-aligned box given by its min and max corners (world units = meters). */
export interface Box {
  min: Vec3
  max: Vec3
}

/** Gravity directions: the direction things fall. */
export type GravityDir = '-y' | '+y' | '-x' | '+x' | '-z' | '+z'

export type Material = 'paper' | 'surface' | 'ink' | 'accent' | 'glass'

/** Boolean expression over world flags. */
export type Cond = string | { all: Cond[] } | { any: Cond[] } | { not: Cond }

export interface BoxDef extends Box {
  mat?: Material
  /** Present (solid + visible) only while the condition holds. */
  when?: Cond
}

export type Action =
  /** p' = to + rotY(p - from). Applied to player position, velocity, yaw and held cube. */
  | { type: 'teleport'; from: Vec3; to: Vec3; rotY?: 0 | 90 | 180 | 270 }
  | { type: 'flag'; flag: string; value?: boolean; persist?: boolean }
  | { type: 'checkpoint'; pos: Vec3; yaw: number }
  | { type: 'gravity'; dir: GravityDir }
  | { type: 'event'; name: string }
  | { type: 'ending' }

export interface TriggerDef {
  id: string
  box: Box
  when?: Cond
  /** Fire only while the player's velocity points along this direction (dot > 0). */
  dir?: Vec3
  /** Fire once per area reset (transient) instead of on every entry. */
  once?: boolean
  actions: Action[]
}

export interface CubeDef {
  type: 'cube'
  id: string
  pos: Vec3
  /** Edge length. */
  size: number
  /** Superliminal-style: held cube keeps its apparent size. */
  scalable?: boolean
  /** Moves along the path only while nobody is looking at it. */
  creep?: { path: Vec3[]; speed: number }
  when?: Cond
}

export interface PlateDef {
  type: 'plate'
  id: string
  box: Box
  /** What can press it. Default 'cube'. */
  accepts?: 'cube' | 'any'
  /** Smallest cube edge that counts. */
  minSize?: number
  /** Flag set while pressed. Default `plate:<id>`. */
  flag?: string
  /** Also set this flag permanently (persisted) the first time it is pressed. */
  latch?: string
}

/** Box that slides away along +up while the condition holds. */
export interface DoorDef {
  type: 'door'
  id: string
  box: Box
  openWhen: Cond
  mat?: Material
}

/** Observation-dependent geometry. */
export interface GhostDef {
  type: 'ghost'
  id: string
  box: Box
  /** 'seen': exists only while inside the camera frustum. 'unseen': only while outside. */
  present: 'seen' | 'unseen'
  mat?: Material
  /** Gate: when false the ghost is absent regardless of observation. */
  when?: Cond
}

/** Forced-perspective bridge: solid while viewed from the vantage cone, or once latched. */
export interface AlignDef {
  type: 'align'
  id: string
  /** Solid volume once aligned. */
  box: Box
  /** Visible fragments; together they read as `box` from the vantage point. */
  fragments: BoxDef[]
  vantage: { pos: Vec3; radius: number; lookAt: Vec3; coneDeg: number }
  /** Flag set while aligned. Default `align:<id>`. */
  flag?: string
}

export interface CaptionDef {
  type: 'caption'
  id: string
  /** Key into AreaDef.strings (or global i18n). */
  text: string
  pos: Vec3
  rotY?: number
  /** Text height in meters. */
  size?: number
  style?: 'fig' | 'display'
  when?: Cond
}

/**
 * Anamorphic text: a panel of text broken into shards scattered along the rays from a
 * vantage eye point. From the vantage the shards line up into the readable panel; reading
 * it sets `read:<id>` (persisted) and the shards then assemble for good.
 */
export interface AnamorphDef {
  type: 'anamorph'
  id: string
  /** Portfolio section this monument records (opens the overlay there). */
  section: 'about' | 'capabilities' | 'stack' | 'experience' | 'contact'
  /** Small figure label, a title, then body lines — keys into strings. */
  label: string
  title: string
  lines: string[]
  /** Eye position of the vantage (feet are 1.47 m lower). */
  vantage: Vec3
  /** Center of the readable panel. */
  center: Vec3
  /** Panel height in meters. */
  height: number
  when?: Cond
}

export type EntityDef =
  | CubeDef
  | PlateDef
  | DoorDef
  | GhostDef
  | AlignDef
  | CaptionDef
  | AnamorphDef

export interface AreaDef {
  id: string
  /** Region used to know which area the player is in (hints, reset, save). */
  bounds: Box
  spawn: { pos: Vec3; yaw: number }
  gravity?: GravityDir
  boxes: BoxDef[]
  entities: EntityDef[]
  triggers: TriggerDef[]
  /** Ordered hint string keys, revealed one at a time from the pause menu. */
  hints?: string[]
  strings?: { en: Record<string, string>; cs: Record<string, string> }
}
