import type { SaveSnapshot } from '../gameplay/game'
import { isGravityDir } from '../gameplay/gravity'

// Versioned save in localStorage. Anything unreadable is discarded (never crashes boot);
// the caller is told so it can show a notice.

export const SAVE_KEY = 'unbuilt.save'
export const SAVE_VERSION = 1

interface SaveFileV1 extends SaveSnapshot {
  v: 1
  savedAt: number
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveSnapshot }
  | { status: 'corrupt' }

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): Store | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Storage can throw in private mode or with blocked site data.
    return null
  }
}

const isVec3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

export function parseSave(raw: string): LoadResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { status: 'corrupt' }
  }
  if (typeof data !== 'object' || data === null) return { status: 'corrupt' }
  const d = data as Record<string, unknown>
  if (d.v !== SAVE_VERSION) return { status: 'corrupt' }
  const cp = d.checkpoint as Record<string, unknown> | undefined
  if (
    !Array.isArray(d.flags) ||
    !d.flags.every((f) => typeof f === 'string') ||
    !cp ||
    !isVec3(cp.pos) ||
    typeof cp.yaw !== 'number' ||
    !isGravityDir(cp.gravity)
  )
    return { status: 'corrupt' }
  return {
    status: 'ok',
    save: { flags: d.flags, checkpoint: { pos: cp.pos, yaw: cp.yaw, gravity: cp.gravity } },
  }
}

export function loadSave(store: Store | null = storage()): LoadResult {
  try {
    const raw = store?.getItem(SAVE_KEY)
    if (!raw) return { status: 'empty' }
    const r = parseSave(raw)
    if (r.status === 'corrupt') store?.removeItem(SAVE_KEY)
    return r
  } catch {
    // Storage access can throw (SecurityError); play without persistence.
    return { status: 'empty' }
  }
}

export function writeSave(s: SaveSnapshot, store: Store | null = storage()) {
  const file: SaveFileV1 = { v: 1, savedAt: Date.now(), ...s }
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(file))
  } catch {
    // Quota or disabled storage: progress simply is not persisted.
  }
}

export function clearSave(store: Store | null = storage()) {
  try {
    store?.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
