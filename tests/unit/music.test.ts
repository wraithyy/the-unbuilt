import { describe, expect, it } from 'vitest'
import { AREA_IDS, cueFor } from '../../src/engine/cues'
import { midiHz, nextBellIndex, THEMES } from '../../src/engine/music'
import { Game, type GameEvent } from '../../src/gameplay/game'
import { room, run } from './helpers'

describe('music', () => {
  it('has a theme for every area', () => {
    for (const id of AREA_IDS) expect(THEMES[id], id).toBeDefined()
  })

  it('themes are playable data', () => {
    for (const [id, th] of Object.entries(THEMES)) {
      expect(th.beat, id).toBeGreaterThan(0.3)
      expect(th.chords.length, id).toBeGreaterThan(0)
      expect(th.scale.length, id).toBeGreaterThanOrEqual(4)
      for (const n of [...th.chords.flat(), ...th.scale, ...(th.arp ?? [])]) {
        expect(n, id).toBeGreaterThanOrEqual(24)
        expect(n, id).toBeLessThanOrEqual(96)
      }
    }
  })

  it('bell walk never leaves the scale', () => {
    let i = 3
    for (let k = 0; k < 2000; k++) {
      i = nextBellIndex(i, 6, (k * 0.6180339) % 1)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(6)
    }
    expect(nextBellIndex(0, 6, 0.85)).toBe(2)
    expect(nextBellIndex(5, 6, 0.95)).toBe(3)
  })

  it('tunes A4 to 440 Hz', () => {
    expect(midiHz(69)).toBe(440)
    expect(midiHz(81)).toBeCloseTo(880)
  })
})

describe('footfall', () => {
  it('walking emits steps, standing does not', () => {
    const g = new Game([room()])
    const events: GameEvent['name'][] = []
    g.on((e) => events.push(e.name))
    run(g, 1, { x: 0, y: 0, jump: false, interact: false })
    events.length = 0
    run(g, 1, { x: 0, y: 0, jump: false, interact: false })
    expect(events).not.toContain('step')
    run(g, 2, { x: 0, y: 1, jump: false, interact: false })
    const steps = events.filter((e) => e === 'step').length
    // 4.2 m/s for 2 s minus acceleration, 1.7 m stride.
    expect(steps).toBeGreaterThanOrEqual(3)
    expect(steps).toBeLessThanOrEqual(5)
    expect(cueFor({ name: 'step' })).toEqual({ cue: 'step' })
  })

  it('a jump lands once', () => {
    const g = new Game([room()])
    run(g, 1, { x: 0, y: 0, jump: false, interact: false })
    const events: GameEvent['name'][] = []
    g.on((e) => events.push(e.name))
    run(g, 0.05, { x: 0, y: 0, jump: true, interact: false })
    run(g, 1.5, { x: 0, y: 0, jump: false, interact: false })
    expect(events.filter((e) => e === 'land')).toHaveLength(1)
  })
})
