// Generative score, synthesized like everything else. Each area has a theme: a slow pad
// progression, a sub bass, and sparse glass bells that random-walk a scale. Themes carry
// the area's rule into sound: the loop's ostinato repeats and slips one note per cycle,
// perspective throws bells across octaves, inversion plays every note backwards (swell,
// then cut). Pure data below; the scheduler only reads it.

export interface Theme {
  /** Seconds per beat. */
  beat: number
  /** Beats per chord. */
  chordBeats: number
  /** MIDI notes per chord. */
  chords: number[][]
  /** MIDI notes the bells walk over. */
  scale: number[]
  /** Chance of a bell per beat. */
  bell: number
  /** Ostinato played every beat; shifts by one each chord cycle. */
  arp?: number[]
  bass?: boolean
  /** Bells jump octaves. */
  octaves?: boolean
  /** Reversed envelopes. */
  reverse?: boolean
  gain: number
  /** Pad lowpass cutoff (Hz). */
  cutoff: number
}

export const THEMES: Record<string, Theme> = {
  arrival: {
    beat: 1.6,
    chordBeats: 8,
    chords: [
      [45, 52, 59],
      [43, 50, 57],
    ],
    scale: [69, 72, 74, 76, 79, 81],
    bell: 0.1,
    gain: 0.5,
    cutoff: 700,
  },
  atrium: {
    beat: 1.25,
    chordBeats: 8,
    chords: [
      [50, 57, 60, 64],
      [46, 53, 57, 62],
      [48, 55, 57, 64],
      [43, 50, 57, 58],
    ],
    scale: [62, 64, 65, 67, 69, 71, 72, 74, 76],
    bell: 0.22,
    bass: true,
    gain: 0.8,
    cutoff: 1100,
  },
  loop: {
    beat: 0.9,
    chordBeats: 8,
    chords: [
      [40, 47, 54, 55],
      [36, 43, 52, 59],
    ],
    scale: [64, 66, 67, 71, 74, 76],
    bell: 0.08,
    arp: [64, 67, 71, 74, 71, 67],
    bass: true,
    gain: 0.75,
    cutoff: 900,
  },
  perspective: {
    beat: 1.1,
    chordBeats: 8,
    chords: [
      [41, 48, 57, 64],
      [43, 50, 59, 62],
    ],
    scale: [65, 67, 69, 71, 72, 76, 77, 79],
    bell: 0.32,
    octaves: true,
    bass: true,
    gain: 0.75,
    cutoff: 1500,
  },
  inversion: {
    beat: 1.3,
    chordBeats: 6,
    chords: [
      [44, 50, 54, 60],
      [46, 52, 56, 62],
    ],
    scale: [60, 62, 64, 66, 68, 70, 72],
    bell: 0.28,
    reverse: true,
    bass: true,
    gain: 0.75,
    cutoff: 800,
  },
  convergence: {
    beat: 1.0,
    chordBeats: 8,
    chords: [
      [38, 50, 57, 62, 65],
      [34, 50, 58, 62, 65],
      [36, 48, 55, 64, 67],
      [33, 45, 52, 57, 64],
    ],
    scale: [62, 64, 65, 67, 69, 72, 74, 77],
    bell: 0.3,
    arp: [62, 65, 69, 72],
    octaves: true,
    bass: true,
    gain: 0.85,
    cutoff: 1400,
  },
  ending: {
    beat: 1.4,
    chordBeats: 8,
    chords: [
      [48, 55, 62, 64],
      [45, 53, 57, 64],
      [47, 55, 59, 64],
      [45, 52, 60, 62],
    ],
    scale: [64, 67, 69, 72, 74, 76, 79],
    bell: 0.25,
    bass: true,
    gain: 0.9,
    cutoff: 1800,
  },
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** Next bell note: a short random walk so phrases sound sung, not sprayed. */
export function nextBellIndex(prev: number, len: number, r: number) {
  const step = r < 0.4 ? -1 : r < 0.8 ? 1 : r < 0.9 ? -2 : 2
  const i = prev + step
  return i < 0 ? -i : i >= len ? 2 * (len - 1) - i : i
}

interface Playing {
  theme: Theme
  bus: GainNode
  beat: number
  nextTime: number
  bellIdx: number
}

export function createMusic(ctx: AudioContext, out: AudioNode) {
  const LOOKAHEAD = 1.2
  let cur: Playing | null = null
  let currentId = ''

  function voice(
    bus: AudioNode,
    freq: number,
    t: number,
    dur: number,
    peak: number,
    type: OscillatorType,
    attack: number,
    release: number,
    detune = 0,
  ) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release))
    g.gain.linearRampToValueAtTime(0, t + dur)
    o.connect(g).connect(bus)
    o.start(t)
    o.stop(t + dur + 0.05)
    o.onended = () => {
      o.disconnect()
      g.disconnect()
    }
  }

  function pad(p: Playing, notes: number[], t: number, dur: number) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.value = 0.7
    // The filter opens and closes over the chord: the pad breathes.
    f.frequency.setValueAtTime(p.theme.cutoff * 0.4, t)
    f.frequency.linearRampToValueAtTime(p.theme.cutoff, t + dur * 0.5)
    f.frequency.linearRampToValueAtTime(p.theme.cutoff * 0.5, t + dur)
    f.connect(p.bus)
    const peak = 0.3 / notes.length
    for (const n of notes) {
      voice(f, midiHz(n), t, dur, peak, 'sawtooth', dur * 0.3, dur * 0.35, -7)
      voice(f, midiHz(n), t, dur, peak, 'triangle', dur * 0.3, dur * 0.35, 7)
    }
    setTimeout(() => f.disconnect(), (t - ctx.currentTime + dur + 1) * 1000)
  }

  function bell(p: Playing, freq: number, t: number, peak: number) {
    const rev = p.theme.reverse
    const dur = rev ? 1.6 : 3.2
    const car = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const modGain = ctx.createGain()
    const g = ctx.createGain()
    car.frequency.value = freq
    mod.frequency.value = freq * 2
    // FM index decays: bright strike, pure tail (or the reverse for inversion).
    const idx = freq * 1.6
    modGain.gain.setValueAtTime(rev ? 0 : idx, t)
    modGain.gain.linearRampToValueAtTime(rev ? idx : 0, t + dur * 0.6)
    if (rev) {
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + dur - 0.04)
      g.gain.linearRampToValueAtTime(0, t + dur)
    } else {
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(peak, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    }
    mod.connect(modGain).connect(car.frequency)
    car.connect(g).connect(p.bus)
    car.start(t)
    mod.start(t)
    car.stop(t + dur + 0.05)
    mod.stop(t + dur + 0.05)
    car.onended = () => {
      car.disconnect()
      mod.disconnect()
      modGain.disconnect()
      g.disconnect()
    }
  }

  function scheduleBeat(p: Playing, t: number) {
    const th = p.theme
    const cycle = Math.floor(p.beat / th.chordBeats)
    const chord = th.chords[cycle % th.chords.length]
    const chordDur = th.chordBeats * th.beat
    if (p.beat % th.chordBeats === 0) {
      // Overlap so chords cross-fade instead of gapping.
      pad(p, chord, t, chordDur * 1.35)
      if (th.bass) voice(p.bus, midiHz(chord[0] - 12), t, chordDur * 1.1, 0.22, 'sine', 1.5, 2)
    }
    if (th.arp) {
      const i = (p.beat + cycle) % th.arp.length
      bell(p, midiHz(th.arp[i]), t, 0.07)
    }
    if (Math.random() < th.bell) {
      p.bellIdx = nextBellIndex(p.bellIdx, th.scale.length, Math.random())
      let n = th.scale[p.bellIdx]
      if (th.octaves && Math.random() < 0.35) n += Math.random() < 0.5 ? -12 : 12
      // Off-beat placement keeps bells from ticking like a metronome.
      const off = Math.random() < 0.3 ? th.beat * 0.5 : 0
      bell(p, midiHz(n), t + off, 0.13)
    }
    p.beat++
  }

  const timer = setInterval(() => {
    const p = cur
    if (!p || ctx.state !== 'running') return
    const horizon = ctx.currentTime + LOOKAHEAD
    // After a long suspend, skip ahead instead of firing a backlog of beats at once.
    if (p.nextTime < ctx.currentTime - p.theme.beat) p.nextTime = ctx.currentTime + 0.05
    while (p.nextTime < horizon) {
      scheduleBeat(p, p.nextTime)
      p.nextTime += p.theme.beat
    }
  }, 250)

  return {
    setTheme(id: string) {
      if (id === currentId) return
      currentId = id
      const t = ctx.currentTime
      const old = cur
      cur = null
      if (old) {
        old.bus.gain.cancelScheduledValues(t)
        old.bus.gain.setValueAtTime(old.bus.gain.value, t)
        old.bus.gain.linearRampToValueAtTime(0, t + 3)
        setTimeout(() => old.bus.disconnect(), 16000)
      }
      const theme = THEMES[id]
      if (!theme) return
      const bus = ctx.createGain()
      bus.gain.setValueAtTime(0, t)
      bus.gain.linearRampToValueAtTime(theme.gain, t + 3)
      bus.connect(out)
      cur = { theme, bus, beat: 0, nextTime: t + 0.1, bellIdx: Math.floor(theme.scale.length / 2) }
    },
    dispose() {
      clearInterval(timer)
    },
  }
}
