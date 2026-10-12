import type { GameEvent } from '../gameplay/game'
import type { Lang } from '../portfolio/data'

export type CueName =
  | 'ghostOn'
  | 'ghostOff'
  | 'teleport'
  | 'plateOn'
  | 'plateOff'
  | 'door'
  | 'grab'
  | 'drop'
  | 'blocked'
  | 'gravity'
  | 'checkpoint'
  | 'solve'
  | 'secret'
  | 'respawn'

export type SubKey = 'ghost' | 'door' | 'solve' | 'secret' | 'gravity' | 'respawn' | 'plate'

export const SUBTITLES: Record<SubKey, Record<Lang, string>> = {
  ghost: { en: 'something shifts', cs: 'něco se pohnulo' },
  door: { en: 'a door opens', cs: 'otevírají se dveře' },
  solve: { en: 'something falls into place', cs: 'něco zapadlo na místo' },
  secret: { en: 'a hidden thing stirs', cs: 'cosi skryté se probouzí' },
  gravity: { en: 'the ground turns', cs: 'zem se otáčí' },
  respawn: { en: 'you begin again', cs: 'začínáš znovu' },
  plate: { en: 'a plate clicks', cs: 'destička cvakla' },
}

export interface Cue {
  cue: CueName
  sub?: SubKey
}

/** Pure event -> cue mapping; null means deliberate silence. */
export function cueFor(e: GameEvent): Cue | null {
  switch (e.name) {
    case 'ghost':
      return { cue: e.present ? 'ghostOn' : 'ghostOff', sub: 'ghost' }
    case 'teleport':
      return { cue: 'teleport' }
    case 'plate':
      return e.pressed ? { cue: 'plateOn', sub: 'plate' } : { cue: 'plateOff' }
    case 'door':
      return e.open ? { cue: 'door', sub: 'door' } : { cue: 'door' }
    case 'grab':
      return { cue: 'grab' }
    case 'drop':
      return { cue: 'drop' }
    case 'blocked':
      return { cue: 'blocked' }
    case 'gravity':
      return { cue: 'gravity', sub: 'gravity' }
    case 'checkpoint':
      return { cue: 'checkpoint' }
    case 'respawn':
      return { cue: 'respawn', sub: 'respawn' }
    case 'custom':
      if (e.id === 'solve') return { cue: 'solve', sub: 'solve' }
      if (e.id === 'secret') return { cue: 'secret', sub: 'secret' }
      return null
    case 'flag':
    case 'align':
    case 'area':
    case 'ending':
      return null
  }
}

/** Minimum ms between repeats of the same cue. */
export const COOLDOWN: Partial<Record<CueName, number>> = {
  ghostOn: 120,
  ghostOff: 120,
  plateOn: 80,
  plateOff: 80,
  grab: 60,
  drop: 60,
  blocked: 250,
  teleport: 300,
}
export const DEFAULT_COOLDOWN = 40
/** Subtitles repeat far less often than sounds, so flickering ghosts don't spam the HUD. */
export const SUBTITLE_COOLDOWN = 2500

/** Returns a gate: true if `key` may fire at `now`, recording it when so. */
export function createThrottle() {
  const last = new Map<string, number>()
  return (key: string, now: number, minMs: number) => {
    const prev = last.get(key)
    if (prev !== undefined && now - prev < minMs) return false
    last.set(key, now)
    return true
  }
}

export const AREA_IDS = [
  'arrival',
  'atrium',
  'loop',
  'perspective',
  'inversion',
  'convergence',
  'ending',
] as const
