import type { Cond } from '../world/types'

// World flags. `persistent` is the subset that survives reloads and puzzle resets.

export interface Flags {
  all: Set<string>
  persistent: Set<string>
}

export function createFlags(persisted: readonly string[] = []): Flags {
  return { all: new Set(persisted), persistent: new Set(persisted) }
}

export function setFlag(f: Flags, flag: string, value = true, persist = false) {
  if (value) {
    f.all.add(flag)
    if (persist) f.persistent.add(flag)
  } else {
    f.all.delete(flag)
    f.persistent.delete(flag)
  }
}

/** Drops transient flags, keeping persistent ones (puzzle reset). */
export function clearTransient(f: Flags) {
  for (const flag of f.all) if (!f.persistent.has(flag)) f.all.delete(flag)
}

export function evalCond(c: Cond | undefined, flags: ReadonlySet<string>): boolean {
  if (c === undefined) return true
  if (typeof c === 'string') return flags.has(c)
  if ('all' in c) return c.all.every((x) => evalCond(x, flags))
  if ('any' in c) return c.any.some((x) => evalCond(x, flags))
  return !evalCond(c.not, flags)
}

/** Sigils earned by solving areas 2–4; all three open the Atrium core. */
export const SIGILS = ['sigil:loop', 'sigil:perspective', 'sigil:inversion'] as const
export const SECRETS = ['secret:loop', 'secret:perspective', 'secret:inversion'] as const
