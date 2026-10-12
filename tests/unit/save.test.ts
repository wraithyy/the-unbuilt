import { describe, expect, it } from 'vitest'
import { loadSave, parseSave, SAVE_KEY, writeSave } from '../../src/engine/save'

function mem() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  }
}

describe('save', () => {
  it('round-trips', () => {
    const s = mem()
    writeSave({ flags: ['sigil:loop'], checkpoint: { pos: [1, 2, 3], yaw: 1, gravity: '-y' } }, s)
    const r = loadSave(s)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.save.flags).toEqual(['sigil:loop'])
  })

  it('discards corrupt and incompatible saves', () => {
    const s = mem()
    s.setItem(SAVE_KEY, '{not json')
    expect(loadSave(s).status).toBe('corrupt')
    expect(s.m.has(SAVE_KEY)).toBe(false)
    expect(parseSave(JSON.stringify({ v: 99 })).status).toBe('corrupt')
    expect(
      parseSave(
        JSON.stringify({ v: 1, flags: [], checkpoint: { pos: [0, 0], yaw: 0, gravity: '-y' } }),
      ).status,
    ).toBe('corrupt')
    expect(loadSave(mem()).status).toBe('empty')
  })
})
