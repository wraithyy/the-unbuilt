import { describe, expect, it } from 'vitest'
import { COOLDOWN, createThrottle, cueFor, SUBTITLES, type SubKey } from '../../src/engine/cues'
import type { GameEvent } from '../../src/gameplay/game'

const events: GameEvent[] = [
  { name: 'ghost', id: 'g', present: true },
  { name: 'ghost', id: 'g', present: false },
  { name: 'teleport' },
  { name: 'plate', id: 'p', pressed: true },
  { name: 'plate', id: 'p', pressed: false },
  { name: 'door', id: 'd', open: true },
  { name: 'door', id: 'd', open: false },
  { name: 'grab' },
  { name: 'drop' },
  { name: 'blocked' },
  { name: 'gravity', dir: '-y', instant: false },
  { name: 'checkpoint' },
  { name: 'flag', flag: 'f', value: true, persist: true },
  { name: 'respawn' },
  { name: 'align', id: 'a', aligned: true },
  { name: 'area', id: 'atrium' },
  { name: 'ending' },
  { name: 'eyes', closed: true },
  { name: 'custom', id: 'solve' },
  { name: 'custom', id: 'secret' },
  { name: 'custom', id: 'atrium' },
]

describe('cueFor', () => {
  it('handles every event without throwing', () => {
    for (const e of events) expect(() => cueFor(e)).not.toThrow()
  })
  it('keeps meaningful cues subtitled and minor ones not', () => {
    expect(cueFor({ name: 'ghost', id: 'g', present: true })?.sub).toBe('ghost')
    expect(cueFor({ name: 'door', id: 'd', open: true })?.sub).toBe('door')
    expect(cueFor({ name: 'door', id: 'd', open: false })?.sub).toBeUndefined()
    expect(cueFor({ name: 'custom', id: 'solve' })?.sub).toBe('solve')
    for (const n of ['grab', 'drop', 'teleport'] as const)
      expect(cueFor({ name: n })?.sub).toBeUndefined()
    expect(cueFor({ name: 'area', id: 'atrium' })).toBeNull()
    expect(cueFor({ name: 'custom', id: 'unknown' })).toBeNull()
  })
  it('every referenced subtitle exists in en and cs', () => {
    for (const e of events) {
      const sub = cueFor(e)?.sub
      if (sub)
        for (const l of ['en', 'cs'] as const) expect(SUBTITLES[sub][l].length).toBeGreaterThan(0)
    }
    for (const k of Object.keys(SUBTITLES) as SubKey[]) {
      expect(SUBTITLES[k].en).toBeTruthy()
      expect(SUBTITLES[k].cs).toBeTruthy()
    }
  })
})

describe('createThrottle', () => {
  it('blocks repeats within the cooldown per key', () => {
    const gate = createThrottle()
    const ms = COOLDOWN.ghostOn ?? 120
    expect(gate('a', 1000, ms)).toBe(true)
    expect(gate('a', 1000 + ms - 1, ms)).toBe(false)
    expect(gate('b', 1010, ms)).toBe(true)
    expect(gate('a', 1000 + ms, ms)).toBe(true)
  })
})
